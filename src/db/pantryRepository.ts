import type { SQLiteDatabase } from "expo-sqlite";
import { runWriteTransaction } from "./writeTransaction";

export async function getStoredPantryIngredientIds(db: SQLiteDatabase) {
  const rows = await db.getAllAsync<{ ingredient_id: string }>(
    "SELECT ingredient_id FROM pantry_items ORDER BY created_at, ingredient_id"
  );
  return rows.map((row) => row.ingredient_id);
}

export async function replaceStoredPantry(
  db: SQLiteDatabase,
  ingredientIds: string[]
) {
  await runWriteTransaction(db, async (transactionDb) => {
    await transactionDb.runAsync("DELETE FROM pantry_items");
    const now = new Date().toISOString();
    for (const ingredientId of [...new Set(ingredientIds)]) {
      await transactionDb.runAsync(
        "INSERT INTO pantry_items (ingredient_id, created_at, updated_at) VALUES (?, ?, ?)",
        [ingredientId, now, now]
      );
    }
  });
}
