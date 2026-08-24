// src/db/shoppingListsRepository.ts
// CRUD for the shopping_lists table itself (list metadata: name, whether it's
// the one list wired to the real backend). Item rows live in
// shoppingListRepository.ts and reference a list via list_id.

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

export async function insertShoppingList(
  db: SQLiteDatabase,
  list: ShoppingListMeta
) {
  await db.runAsync(
    `
    INSERT INTO shopping_lists (id, name, is_default_synced_list, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?)
    `,
    [
      list.id,
      list.name,
      list.isDefaultSyncedList ? 1 : 0,
      list.createdAt,
      list.updatedAt,
    ]
  );
}

export async function upsertShoppingList(
  db: SQLiteDatabase,
  list: ShoppingListMeta
) {
  await db.runAsync(
    `
    INSERT INTO shopping_lists (id, name, is_default_synced_list, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      name = excluded.name,
      updated_at = excluded.updated_at
    `,
    [
      list.id,
      list.name,
      list.isDefaultSyncedList ? 1 : 0,
      list.createdAt,
      list.updatedAt,
    ]
  );
}

export async function renameShoppingList(
  db: SQLiteDatabase,
  listId: string,
  name: string
) {
  await db.runAsync(
    `
    UPDATE shopping_lists
    SET name = ?, updated_at = ?
    WHERE id = ?
    `,
    [name, new Date().toISOString(), listId]
  );
}

export async function deleteShoppingList(db: SQLiteDatabase, listId: string) {
  await db.runAsync(
    `
    DELETE FROM shopping_lists
    WHERE id = ? AND is_default_synced_list = 0
    `,
    [listId]
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
