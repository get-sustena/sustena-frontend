import type { SQLiteDatabase } from "expo-sqlite";
import type { Ingredient } from "../types/api";
import { runWithSqliteRetry } from "./sqliteGuards";

// The ingredient catalogue as last fetched, so it shows at once on the next
// start while a fresh copy loads. It isn't anyone's own data, so it stays
// after sign-out.
const KEY = "ingredient_catalog";
// Bump when the Ingredient shape changes, so an update never reads a copy
// saved in the old shape.
const FORMAT = 1;

type SavedCatalog = { format: number; ingredients: Ingredient[] };

export async function getSavedIngredientCatalog(db: SQLiteDatabase) {
  return runWithSqliteRetry(async () => {
    const row = await db.getFirstAsync<{ value: string }>(
      "SELECT value FROM local_metadata WHERE key = ?",
      [KEY]
    );
    if (!row) return null;

    try {
      const saved = JSON.parse(row.value) as SavedCatalog;
      return saved.format === FORMAT ? saved.ingredients : null;
    } catch {
      return null;
    }
  });
}

export async function saveIngredientCatalog(db: SQLiteDatabase, ingredients: Ingredient[]) {
  const saved: SavedCatalog = { format: FORMAT, ingredients };
  await runWithSqliteRetry(async () => {
    await db.runAsync(
      `
      INSERT INTO local_metadata (key, value, updated_at)
      VALUES (?, ?, ?)
      ON CONFLICT(key) DO UPDATE SET
        value = excluded.value,
        updated_at = excluded.updated_at
      `,
      [KEY, JSON.stringify(saved), new Date().toISOString()]
    );
  });
}
