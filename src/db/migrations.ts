// src/db/migrations.ts

import { type SQLiteDatabase } from "expo-sqlite";

const DATABASE_VERSION = 2;

export async function migrateDbIfNeeded(db: SQLiteDatabase) {
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
}
