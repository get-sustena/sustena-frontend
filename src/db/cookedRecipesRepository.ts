import type { SQLiteDatabase } from "expo-sqlite";
import { runWithSqliteRetry } from "./sqliteGuards";

// The Lagos day a person last marked a recipe cooked, so "Cooked today"
// still shows after leaving the recipe and coming back. Keyed by person so a
// shared phone doesn't mix two accounts up.
function cookedDayKey(userId: string, recipeId: string) {
  return `recipe_cooked:${userId}:${recipeId}`;
}

export async function getCookedDay(
  db: SQLiteDatabase,
  userId: string,
  recipeId: string
) {
  return runWithSqliteRetry(async () => {
    const result = await db.getFirstAsync<{ value: string }>(
      "SELECT value FROM local_metadata WHERE key = ?",
      [cookedDayKey(userId, recipeId)]
    );

    return result?.value ?? null;
  });
}

export async function saveCookedDay(
  db: SQLiteDatabase,
  userId: string,
  recipeId: string,
  lagosDay: string
) {
  await runWithSqliteRetry(async () => {
    await db.runAsync(
      `
      INSERT INTO local_metadata (key, value, updated_at)
      VALUES (?, ?, ?)
      ON CONFLICT(key) DO UPDATE SET
        value = excluded.value,
        updated_at = excluded.updated_at
      `,
      [cookedDayKey(userId, recipeId), lagosDay, new Date().toISOString()]
    );
  });
}
