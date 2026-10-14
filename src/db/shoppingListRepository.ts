import { type SQLiteDatabase } from "expo-sqlite";
import { ShoppingListItem } from "../types/shoppingList";
import { runWithSqliteRetry } from "./sqliteGuards";
import { runWriteTransaction } from "./writeTransaction";
import {
  insertShoppingListItem,
  replaceListItemsKeepingPendingEdits,
  type ShoppingListItemRow,
} from "./shoppingItemRows";

export async function getStoredShoppingListItems(
  db: SQLiteDatabase,
  listId?: string
) {
  if (listId) {
    return db.getAllAsync<ShoppingListItemRow>(
      `
      SELECT *
      FROM shopping_list_items
      WHERE list_id = ?
      ORDER BY created_at ASC
      `,
      [listId]
    );
  }

  return db.getAllAsync<ShoppingListItemRow>(
    `
    SELECT *
    FROM shopping_list_items
    ORDER BY created_at ASC
    `
  );
}

export async function insertShoppingListItems(
  db: SQLiteDatabase,
  items: ShoppingListItem[]
) {
  await runWithSqliteRetry(async () => {
    await runWriteTransaction(db, async (transactionDb) => {
      for (const item of items) {
        await insertShoppingListItem(transactionDb, item);
      }
    });
  });
}

// Saves a server reply for one list, keeping edits not yet sent. Returns
// the list as saved.
export function replaceShoppingListItemsForList(
  db: SQLiteDatabase,
  listId: string,
  items: ShoppingListItem[]
) {
  return runWithSqliteRetry(() =>
    runWriteTransaction(db, (transactionDb) =>
      replaceListItemsKeepingPendingEdits(transactionDb, listId, items)
    )
  );
}

export async function deleteCheckedShoppingListItems(
  db: SQLiteDatabase,
  listId: string
) {
  await db.runAsync(
    `
    DELETE FROM shopping_list_items
    WHERE checked = 1 AND list_id = ?
    `,
    [listId]
  );
}

export async function deleteShoppingListItemsForList(
  db: SQLiteDatabase,
  listId: string
) {
  await db.runAsync(
    `
    DELETE FROM shopping_list_items
    WHERE list_id = ?
    `,
    [listId]
  );
}

export async function getShoppingListItemSummaries(db: SQLiteDatabase) {
  return db.getAllAsync<{
    list_id: string;
    item_count: number;
    checked_count: number;
    total_estimated_price: number;
  }>(
    `
    SELECT
      list_id,
      COUNT(*) AS item_count,
      SUM(CASE WHEN checked = 1 THEN 1 ELSE 0 END) AS checked_count,
      SUM(estimated_price) AS total_estimated_price
    FROM shopping_list_items
    GROUP BY list_id
    `
  );
}
