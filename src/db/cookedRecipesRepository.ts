import type { SQLiteDatabase } from "expo-sqlite";
import { runWithSqliteRetry } from "./sqliteGuards.ts";

// The Lagos day a person last marked a recipe cooked, so "Cooked today"
// still shows after leaving the recipe and coming back. Keyed by person so a
// shared phone doesn't mix two accounts up.
export function cookedDayKey(userId: string, recipeId: string) {
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
