
import { type SQLiteDatabase } from "expo-sqlite";
import { ShoppingListMeta } from "../types/shoppingList";

type ShoppingListRow = {
  id: string;
  name: string;
  is_default_synced_list: number;
  created_at: string;
  updated_at: string;
};

export async function getStoredShoppingLists(db: SQLiteDatabase) {
  return db.getAllAsync<ShoppingListRow>(
    `
    SELECT *
    FROM shopping_lists
    ORDER BY created_at ASC
    `
  );
}

export function mapShoppingListRowToMeta(
  row: ShoppingListRow
): ShoppingListMeta {
  return {
    id: row.id,
    name: row.name,
    isDefaultSyncedList: Boolean(row.is_default_synced_list),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
