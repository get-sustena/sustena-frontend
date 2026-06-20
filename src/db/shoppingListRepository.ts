import { type SQLiteDatabase } from "expo-sqlite";
import { ShoppingListItem } from "../types/shoppingList";
import { runWithSqliteRetry } from "./sqliteGuards";

type ShoppingListItemRow = {
  id: string;
  name: string;
  emoji: string;
  quantity: string;
  unit: string | null;
  category: string;
  estimated_price: number;
  checked: number;
  source_recipe_id: string | null;
  created_at: string;
  updated_at: string;
};

export async function getStoredShoppingListItems(db: SQLiteDatabase) {
  return db.getAllAsync<ShoppingListItemRow>(
    `
    SELECT *
    FROM shopping_list_items
    ORDER BY created_at ASC
    `
  );
}

export async function insertShoppingListItem(
  db: SQLiteDatabase,
  item: ShoppingListItem
) {
  await db.runAsync(
    `
    INSERT OR REPLACE INTO shopping_list_items (
      id,
      name,
      emoji,
      quantity,
      unit,
      category,
      estimated_price,
      checked,
      source_recipe_id,
      created_at,
      updated_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      item.id,
      item.name,
      item.emoji,
      item.quantity,
      item.unit ?? null,
      item.category,
      item.estimatedPrice,
      item.checked ? 1 : 0,
      item.sourceRecipeId ?? null,
      item.createdAt,
      item.updatedAt,
    ]
  );
}

export async function insertShoppingListItems(
  db: SQLiteDatabase,
  items: ShoppingListItem[]
) {
  await runWithSqliteRetry(async () => {
    await db.withExclusiveTransactionAsync(async (txn) => {
      const transactionDb = txn as unknown as SQLiteDatabase;

      for (const item of items) {
        await insertShoppingListItem(transactionDb, item);
      }
    });
  });
}

export async function updateShoppingListItemChecked(
  db: SQLiteDatabase,
  itemId: string,
  checked: boolean
) {
  await db.runAsync(
    `
    UPDATE shopping_list_items
    SET checked = ?, updated_at = ?
    WHERE id = ?
    `,
    [checked ? 1 : 0, new Date().toISOString(), itemId]
  );
}

export async function deleteShoppingListItem(
  db: SQLiteDatabase,
  itemId: string
) {
  await db.runAsync(
    `
    DELETE FROM shopping_list_items
    WHERE id = ?
    `,
    [itemId]
  );
}

export async function deleteCheckedShoppingListItems(db: SQLiteDatabase) {
  await db.runAsync(
    `
    DELETE FROM shopping_list_items
    WHERE checked = 1
    `
  );
}

export async function deleteAllShoppingListItems(db: SQLiteDatabase) {
  await db.runAsync(`DELETE FROM shopping_list_items`);
}

export function mapShoppingListRowToItem(
  row: ShoppingListItemRow
): ShoppingListItem {
  return {
    id: row.id,
    name: row.name,
    emoji: row.emoji,
    quantity: row.quantity,
    unit: row.unit ?? undefined,
    category: row.category,
    estimatedPrice: row.estimated_price,
    checked: Boolean(row.checked),
    sourceRecipeId: row.source_recipe_id ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
