// Single-statement writes to shopping_list_items. They run inside callers'
// transactions, and are shared by the app and its tests, so nothing here
// imports React Native.
import type { SQLiteDatabase } from "expo-sqlite";
import { DEFAULT_SHOPPING_LIST_ID, type ShoppingListItem } from "../types/shoppingList.ts";

export async function insertShoppingListItem(db: SQLiteDatabase, item: ShoppingListItem) {
  await db.runAsync(
    `
    INSERT OR REPLACE INTO shopping_list_items (
      id,
      ingredient_id,
      name,
      emoji,
      quantity,
      amount,
      display_quantity,
      unit,
      category,
      estimated_price,
      price_status,
      client_mutation_id,
      checked,
      source_recipe_id,
      created_at,
      updated_at,
      list_id
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      item.id,
      item.ingredientId ?? null,
      item.name,
      item.emoji,
      item.quantity,
      item.amount ?? null,
      item.displayQuantity ?? null,
      item.unit ?? null,
      item.category,
      item.estimatedPrice ?? null,
      item.priceStatus ?? (item.estimatedPrice == null ? "unknown" : "estimated"),
      item.clientMutationId ?? null,
      item.checked ? 1 : 0,
      item.sourceRecipeId ?? null,
      item.createdAt,
      item.updatedAt,
      item.listId ?? DEFAULT_SHOPPING_LIST_ID,
    ]
  );
}

export async function updateShoppingListItemChecked(
  db: SQLiteDatabase,
  itemId: string,
  checked: boolean,
  updatedAt = new Date().toISOString()
) {
  await db.runAsync(
    `
    UPDATE shopping_list_items
    SET checked = ?, updated_at = ?
    WHERE id = ?
    `,
    [checked ? 1 : 0, updatedAt, itemId]
  );
}

export async function deleteShoppingListItem(db: SQLiteDatabase, itemId: string) {
  await db.runAsync(
    `
    DELETE FROM shopping_list_items
    WHERE id = ?
    `,
    [itemId]
  );
}
