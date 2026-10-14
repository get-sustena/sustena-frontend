// Reads and writes of shopping_list_items that run inside callers'
// transactions. Shared by the app and its tests, so nothing here imports
// React Native.
import type { SQLiteDatabase } from "expo-sqlite";
import { DEFAULT_SHOPPING_LIST_ID, type ShoppingListItem } from "../types/shoppingList.ts";
import { resolveSyncIdMapping } from "./syncIdMappingRepository.ts";

export type ShoppingListItemRow = {
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

export function mapShoppingListRowToItem(row: ShoppingListItemRow): ShoppingListItem {
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

// The edits to one list still waiting in the outbox.
async function pendingListEdits(tx: SQLiteDatabase, listId: string) {
  const operations = await tx.getAllAsync<{ kind: string; payload_json: string }>(
    `
    SELECT kind, payload_json
    FROM sync_queue
    WHERE kind IN (
      'shopping_list_item_add',
      'shopping_list_item_toggle',
      'shopping_list_items_set_checked',
      'shopping_list_item_remove',
      'shopping_list_recipe_batch'
    )
    ORDER BY created_at ASC, rowid ASC
    `
  );
  const resolve = async (id: string) =>
    (await resolveSyncIdMapping(tx, id, "shopping_list_item")) ?? id;

  const edits = {
    creating: new Set<string>(),
    checked: new Map<string, boolean>(),
    removed: new Set<string>(),
    recipesAdding: false,
  };
  for (const operation of operations) {
    const payload = JSON.parse(operation.payload_json) as {
      listId?: string;
      temporaryId?: string;
      itemId?: string;
      itemIds?: string[];
      checked?: boolean;
    };
    if (payload.listId !== listId) continue;

    switch (operation.kind) {
      case "shopping_list_item_add":
        if (payload.temporaryId) edits.creating.add(payload.temporaryId);
        break;
      case "shopping_list_item_toggle":
        edits.checked.set(await resolve(payload.itemId!), payload.checked!);
        break;
      case "shopping_list_items_set_checked":
        for (const itemId of payload.itemIds ?? []) {
          edits.checked.set(await resolve(itemId), payload.checked!);
        }
        break;
      case "shopping_list_item_remove":
        edits.removed.add(await resolve(payload.itemId!));
        break;
      case "shopping_list_recipe_batch":
        edits.recipesAdding = true;
        break;
    }
  }
  return edits;
}

// Saves the server's copy of a list (QAD-01). A reply can be older than
// edits made on the device, so edits still in the outbox win: items not yet
// created stay, queued checks stay, queued removals stay removed. Returns
// the list as saved, for screens to show.
export async function replaceListItemsKeepingPendingEdits(
  tx: SQLiteDatabase,
  listId: string,
  serverItems: ShoppingListItem[]
) {
  const edits = await pendingListEdits(tx, listId);
  const serverIds = new Set(serverItems.map((item) => item.id));
  const localRows = await tx.getAllAsync<ShoppingListItemRow>(
    "SELECT * FROM shopping_list_items WHERE list_id = ?",
    [listId]
  );
  // Items the server doesn't have yet: created on the device, or added
  // from a recipe that hasn't reached it.
  const notYetOnServer = localRows
    .map(mapShoppingListRowToItem)
    .filter((item) => !serverIds.has(item.id) && (edits.creating.has(item.id) || edits.recipesAdding));

  const saved = [
    ...serverItems
      .filter((item) => !edits.removed.has(item.id))
      .map((item) => ({
        ...item,
        listId,
        checked: edits.checked.get(item.id) ?? item.checked,
      })),
    ...notYetOnServer,
  ];

  await tx.runAsync("DELETE FROM shopping_list_items WHERE list_id = ?", [listId]);
  for (const item of saved) await insertShoppingListItem(tx, item);
  return saved;
}

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
