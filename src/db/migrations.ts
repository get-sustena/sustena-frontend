
import type { SQLiteDatabase } from "expo-sqlite";
import {
  isClosedResourceError,
  runWithSqliteRetry,
} from "./sqliteGuards.ts";

const DATABASE_VERSION = 16;
let migrationQueue = Promise.resolve();

export async function migrateDbIfNeeded(db: SQLiteDatabase) {
  const migration = migrationQueue
    .catch(() => {
      // Allow later callers to retry after a failed migration.
    })
    .then(() =>
      runWithSqliteRetry(async () => {
        try {
          await runMigrations(db);
        } catch (error) {
          if (isClosedResourceError(error)) {
            return;
          }

          throw error;
        }
      })
    );

  migrationQueue = migration;

  await migration;
}

async function runMigrations(db: SQLiteDatabase) {
  await db.execAsync("PRAGMA busy_timeout = 5000");

  const result = await db.getFirstAsync<{ user_version: number }>(
    "PRAGMA user_version"
  );

  const currentDbVersion = result?.user_version ?? 0;

  if (currentDbVersion >= DATABASE_VERSION) {
    return;
  }

  if (currentDbVersion === 0) {
    await db.execAsync(`
      PRAGMA journal_mode = WAL;

      CREATE TABLE IF NOT EXISTS user_preferences (
        id TEXT PRIMARY KEY NOT NULL,
        health_conditions_json TEXT NOT NULL,
        dietary_preference TEXT NOT NULL,
        default_unit_mode TEXT NOT NULL,
        default_serving_size INTEGER NOT NULL,
        haptics_enabled INTEGER NOT NULL,
        data_saver_enabled INTEGER NOT NULL,
        meal_reminders_enabled INTEGER NOT NULL,
        has_completed_onboarding INTEGER NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS shopping_list_items (
        id TEXT PRIMARY KEY NOT NULL,
        name TEXT NOT NULL,
        emoji TEXT NOT NULL,
        quantity TEXT NOT NULL,
        unit TEXT,
        category TEXT NOT NULL,
        estimated_price INTEGER NOT NULL,
        checked INTEGER NOT NULL,
        source_recipe_id TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      PRAGMA user_version = 1;
    `);
  }

  const versionAfterInitialMigration =
    currentDbVersion === 0 ? 1 : currentDbVersion;

  if (versionAfterInitialMigration < 2) {
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS favorite_recipes (
        recipe_id TEXT PRIMARY KEY NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      PRAGMA user_version = 2;
    `);
  }

  const versionAfterFavorites =
    versionAfterInitialMigration < 2 ? 2 : versionAfterInitialMigration;

  if (versionAfterFavorites < 3) {
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS local_metadata (
        key TEXT PRIMARY KEY NOT NULL,
        value TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS recipes (
        id TEXT PRIMARY KEY NOT NULL,
        name TEXT NOT NULL,
        slug TEXT,
        description TEXT,
        image_url TEXT,
        cuisine TEXT,
        source_url TEXT,
        source_name TEXT,
        source_site TEXT,
        review_status TEXT NOT NULL,
        difficulty TEXT,
        estimated_cost REAL,
        calories_per_serving REAL,
        base_servings INTEGER,
        prep_time_minutes INTEGER,
        cook_time_minutes INTEGER,
        total_time_minutes INTEGER,
        active_prep_time_minutes INTEGER,
        passive_time_minutes INTEGER,
        quality_score REAL,
        quality_warnings_json TEXT NOT NULL,
        raw_json TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS recipe_ingredients (
        id TEXT PRIMARY KEY NOT NULL,
        recipe_id TEXT NOT NULL,
        position INTEGER NOT NULL,
        raw_text TEXT NOT NULL,
        ingredient_name TEXT,
        canonical_ingredient_name TEXT,
        quantity TEXT,
        unit TEXT,
        display_text TEXT,
        category TEXT,
        available_units_json TEXT NOT NULL,
        is_core_ingredient INTEGER NOT NULL,
        is_optional INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS recipe_instructions (
        id TEXT PRIMARY KEY NOT NULL,
        recipe_id TEXT NOT NULL,
        step_number INTEGER NOT NULL,
        text TEXT NOT NULL,
        type TEXT
      );

      CREATE TABLE IF NOT EXISTS recipe_notes (
        id TEXT PRIMARY KEY NOT NULL,
        recipe_id TEXT NOT NULL,
        position INTEGER NOT NULL,
        text TEXT NOT NULL,
        type TEXT
      );

      CREATE TABLE IF NOT EXISTS recipe_tags (
        recipe_id TEXT NOT NULL,
        tag TEXT NOT NULL,
        PRIMARY KEY (recipe_id, tag)
      );

      CREATE TABLE IF NOT EXISTS recipe_dietary_tags (
        recipe_id TEXT NOT NULL,
        tag TEXT NOT NULL,
        PRIMARY KEY (recipe_id, tag)
      );

      CREATE TABLE IF NOT EXISTS recipe_allergens (
        recipe_id TEXT NOT NULL,
        allergen TEXT NOT NULL,
        PRIMARY KEY (recipe_id, allergen)
      );

      PRAGMA user_version = 3;
    `);
  }

  const versionAfterRecipes = versionAfterFavorites < 3 ? 3 : versionAfterFavorites;

  if (versionAfterRecipes < 4) {
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS sync_queue (
        id TEXT PRIMARY KEY NOT NULL,
        kind TEXT NOT NULL,
        payload_json TEXT NOT NULL,
        created_at TEXT NOT NULL,
        attempts INTEGER NOT NULL DEFAULT 0
      );

      PRAGMA user_version = 4;
    `);
  }

  const versionAfterSyncQueue = versionAfterRecipes < 4 ? 4 : versionAfterRecipes;

  if (versionAfterSyncQueue < 5) {
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS local_profile_answers (
        id TEXT PRIMARY KEY NOT NULL,
        nickname TEXT,
        gender TEXT,
        birthday_month INTEGER,
        birthday_day INTEGER,
        lifestyle TEXT,
        remote_flex TEXT,
        experience TEXT,
        goals_json TEXT NOT NULL,
        challenges_json TEXT NOT NULL,
        habit_who TEXT,
        habit_freq TEXT,
        habit_time TEXT,
        heard TEXT,
        heard_other TEXT,
        updated_at TEXT NOT NULL
      );

      PRAGMA user_version = 5;
    `);
  }

  const versionAfterProfileAnswers =
    versionAfterSyncQueue < 5 ? 5 : versionAfterSyncQueue;

  // Only the default list participates in server sync.
  if (versionAfterProfileAnswers < 6) {
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS shopping_lists (
        id TEXT PRIMARY KEY NOT NULL,
        name TEXT NOT NULL,
        is_default_synced_list INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      ALTER TABLE shopping_list_items ADD COLUMN list_id TEXT;
    `);

    const defaultListId = "default";
    const now = new Date().toISOString();

    await db.runAsync(
      `
      INSERT INTO shopping_lists (id, name, is_default_synced_list, created_at, updated_at)
      VALUES (?, ?, 1, ?, ?)
      `,
      [defaultListId, "My Shopping List", now, now]
    );

    await db.execAsync(`
      UPDATE shopping_list_items SET list_id = '${defaultListId}' WHERE list_id IS NULL;

      PRAGMA user_version = 6;
    `);
  }

  const versionAfterShoppingLists =
    versionAfterProfileAnswers < 6 ? 6 : versionAfterProfileAnswers;

  if (versionAfterShoppingLists < 7) {
    await db.execAsync(`
      ALTER TABLE recipe_instructions ADD COLUMN segments_json TEXT NOT NULL DEFAULT '[]';

      PRAGMA user_version = 7;
    `);
  }

  const versionAfterInstructionSegments =
    versionAfterShoppingLists < 7 ? 7 : versionAfterShoppingLists;

  if (versionAfterInstructionSegments < 8) {
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS local_planner_settings (
        id TEXT PRIMARY KEY NOT NULL,
        days INTEGER NOT NULL,
        meal_slots_json TEXT NOT NULL,
        meals_per_day INTEGER NOT NULL,
        updated_at TEXT NOT NULL
      );

      PRAGMA user_version = 8;
    `);
  }

  const versionAfterPlannerSettings =
    versionAfterInstructionSegments < 8 ? 8 : versionAfterInstructionSegments;

  if (versionAfterPlannerSettings < 9) {
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS creator_recipe_drafts (
        id TEXT PRIMARY KEY NOT NULL,
        revision INTEGER,
        payload_json TEXT NOT NULL,
        sync_status TEXT NOT NULL,
        last_error TEXT,
        updated_at TEXT NOT NULL
      );

      PRAGMA user_version = 9;
    `);
  }

  const versionAfterCreatorDrafts =
    versionAfterPlannerSettings < 9 ? 9 : versionAfterPlannerSettings;

  if (versionAfterCreatorDrafts < 10) {
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS account_data_snapshots (
        user_id TEXT PRIMARY KEY NOT NULL,
        snapshot_json TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      PRAGMA user_version = 10;
    `);
  }

  const versionAfterAccountSnapshots =
    versionAfterCreatorDrafts < 10 ? 10 : versionAfterCreatorDrafts;

  if (versionAfterAccountSnapshots < 11) {
    await db.execAsync(`
      ALTER TABLE shopping_list_items RENAME TO shopping_list_items_legacy;

      CREATE TABLE shopping_list_items (
        id TEXT PRIMARY KEY NOT NULL,
        name TEXT NOT NULL,
        emoji TEXT NOT NULL,
        quantity TEXT NOT NULL,
        amount REAL,
        display_quantity TEXT,
        unit TEXT,
        category TEXT NOT NULL,
        estimated_price INTEGER,
        price_status TEXT NOT NULL DEFAULT 'unknown',
        client_mutation_id TEXT,
        checked INTEGER NOT NULL,
        source_recipe_id TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        list_id TEXT NOT NULL
      );

      INSERT INTO shopping_list_items (
        id, name, emoji, quantity, unit, category, estimated_price,
        price_status, checked, source_recipe_id, created_at, updated_at, list_id
      )
      SELECT
        id, name, emoji, quantity, unit, category, estimated_price,
        CASE WHEN estimated_price IS NULL THEN 'unknown' ELSE 'estimated' END,
        checked, source_recipe_id, created_at, updated_at,
        COALESCE(list_id, 'default')
      FROM shopping_list_items_legacy;

      DROP TABLE shopping_list_items_legacy;
      CREATE INDEX IF NOT EXISTS ix_local_shopping_items_list_id
        ON shopping_list_items(list_id);
      CREATE UNIQUE INDEX IF NOT EXISTS uq_local_shopping_items_client_mutation
        ON shopping_list_items(list_id, client_mutation_id)
        WHERE client_mutation_id IS NOT NULL;

      PRAGMA user_version = 11;
    `);
  }

  const versionAfterShoppingItemHardening =
    versionAfterAccountSnapshots < 11 ? 11 : versionAfterAccountSnapshots;

  if (versionAfterShoppingItemHardening < 12) {
    await db.execAsync(`
      ALTER TABLE shopping_list_items ADD COLUMN ingredient_id TEXT;

      CREATE TABLE IF NOT EXISTS pantry_items (
        ingredient_id TEXT PRIMARY KEY NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      PRAGMA user_version = 12;
    `);
  }

  const versionAfterPantry =
    versionAfterShoppingItemHardening < 12 ? 12 : versionAfterShoppingItemHardening;

  if (versionAfterPantry < 13) {
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS sync_id_mappings (
        temporary_id TEXT PRIMARY KEY NOT NULL,
        server_id TEXT NOT NULL,
        entity_kind TEXT NOT NULL,
        created_at TEXT NOT NULL
      );

      PRAGMA user_version = 13;
    `);
  }

  const versionAfterSyncIdMappings = versionAfterPantry < 13 ? 13 : versionAfterPantry;

  // F02: a queued edit waits out a backoff after a temporary failure, and is
  // kept for repair after a permanent one, instead of being deleted.
  if (versionAfterSyncIdMappings < 14) {
    await db.execAsync(`
      ALTER TABLE sync_queue ADD COLUMN next_attempt_at INTEGER;
      ALTER TABLE sync_queue ADD COLUMN needs_attention INTEGER NOT NULL DEFAULT 0;
      ALTER TABLE sync_queue ADD COLUMN last_error TEXT;

      PRAGMA user_version = 14;
    `);
  }

  const versionAfterSyncRetries = versionAfterSyncIdMappings < 14 ? 14 : versionAfterSyncIdMappings;

  // QAD-02 and F03: each outbox command carries its format version, a mutation
  // id that stays the same across retries, the entity it creates or changes,
  // and the entity it waits for (an item created offline whose creation
  // hasn't reached the server yet).
  if (versionAfterSyncRetries < 15) {
    await db.execAsync(`
      ALTER TABLE sync_queue ADD COLUMN command_version INTEGER NOT NULL DEFAULT 1;
      ALTER TABLE sync_queue ADD COLUMN mutation_id TEXT;
      ALTER TABLE sync_queue ADD COLUMN entity_id TEXT;
      ALTER TABLE sync_queue ADD COLUMN depends_on TEXT;

      PRAGMA user_version = 15;
    `);
  }

  const versionAfterCommands = versionAfterSyncRetries < 15 ? 15 : versionAfterSyncRetries;

  // OFF-01: recipe photos and creator avatars saved on the phone, by link.
  // A row is written only once its file is complete. Photos are nobody's
  // own data, so they stay after sign-out.
  if (versionAfterCommands < 16) {
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS cached_photos (
        url TEXT PRIMARY KEY NOT NULL,
        file_name TEXT NOT NULL,
        saved_at TEXT NOT NULL
      );

      PRAGMA user_version = 16;
    `);
  }
}
