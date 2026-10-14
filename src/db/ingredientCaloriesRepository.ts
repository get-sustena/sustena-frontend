import type { SQLiteDatabase } from "expo-sqlite";
import { runWithSqliteRetry } from "./sqliteGuards";

// Whether the recipe page shows the calorie line on each ingredient (the eye
// on the Ingredients heading). Kept on the device, as the v6.8 prototype does.
const KEY = "show_ingredient_calories";

export async function getIngredientCaloriesShown(db: SQLiteDatabase) {
  return runWithSqliteRetry(async () => {
    const result = await db.getFirstAsync<{ value: string }>(
      "SELECT value FROM local_metadata WHERE key = ?",
      [KEY]
    );

    // Calories show at first.
    return result?.value !== "off";
  });
}

export async function saveIngredientCaloriesShown(db: SQLiteDatabase, shown: boolean) {
  await runWithSqliteRetry(async () => {
    await db.runAsync(
      `
      INSERT INTO local_metadata (key, value, updated_at)
      VALUES (?, ?, ?)
      ON CONFLICT(key) DO UPDATE SET
        value = excluded.value,
        updated_at = excluded.updated_at
      `,
      [KEY, shown ? "on" : "off", new Date().toISOString()]
    );
  });
}
