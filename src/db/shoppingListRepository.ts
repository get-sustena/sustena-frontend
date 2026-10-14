import { type SQLiteDatabase } from "expo-sqlite";
import { DEFAULT_SHOPPING_LIST_ID, ShoppingListItem } from "../types/shoppingList";
import { runWithSqliteRetry } from "./sqliteGuards";
import { runWriteTransaction } from "./writeTransaction";
import { insertShoppingListItem } from "./shoppingItemRows";

type ShoppingListItemRow = {
  id: string;
  ingredient_id: string | null;
  name: string;
  emoji: string;
  quantity: string;
  amount: number | null;
  display_quantity: string | null;
  unit: string | null;
  category: string;
  estimated_price: number | null;
  price_status: "unknown" | "estimated" | "confirmed";
  client_mutation_id: string | null;
  checked: number;
  source_recipe_id: string | null;
  created_at: string;
  updated_at: string;
  list_id: string | null;
};

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

export async function replaceShoppingListItemsForList(
  db: SQLiteDatabase,
  listId: string,
  items: ShoppingListItem[]
) {
  await runWithSqliteRetry(async () => {
    await runWriteTransaction(db, async (transactionDb) => {
      await transactionDb.runAsync(
        "DELETE FROM shopping_list_items WHERE list_id = ?",
        [listId]
      );

      for (const item of items) {
        await insertShoppingListItem(transactionDb, {
          ...item,
          listId,
        });
      }
    });
  });
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

export function mapShoppingListRowToItem(
  row: ShoppingListItemRow
): ShoppingListItem {
  return {
    id: row.id,
    ingredientId: row.ingredient_id ?? undefined,
    name: row.name,
    emoji: row.emoji,
    quantity: row.quantity,
    amount: row.amount ?? undefined,
    displayQuantity: row.display_quantity ?? undefined,
    unit: row.unit ?? undefined,
    category: row.category,
    estimatedPrice: row.estimated_price,
    priceStatus: row.price_status,
    clientMutationId: row.client_mutation_id ?? undefined,
    checked: Boolean(row.checked),
    sourceRecipeId: row.source_recipe_id ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    listId: row.list_id ?? DEFAULT_SHOPPING_LIST_ID,
  };
}
