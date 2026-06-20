// src/db/migrations.ts

import { type SQLiteDatabase } from "expo-sqlite";
import {
  isClosedResourceError,
  runWithSqliteRetry,
} from "./sqliteGuards";

const DATABASE_VERSION = 3;
let migrationQueue = Promise.resolve();

export async function migrateDbIfNeeded(db: SQLiteDatabase) {
  const migration = migrationQueue
    .catch(() => {
      // Keep the queue alive after a failed migration attempt.
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
}
