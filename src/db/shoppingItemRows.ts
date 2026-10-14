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
  recipe_batch_id: string | null;
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
    recipeBatchId: row.recipe_batch_id ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    listId: row.list_id ?? DEFAULT_SHOPPING_LIST_ID,
  };
}

// When the outbox last had an edit to this list accepted by the server
// (milliseconds). A reply asked for before then can't show that edit.
const acknowledgedKey = (listId: string) => `shopping_list_acknowledged:${listId}`;

export async function markListEditAcknowledged(tx: SQLiteDatabase, listId: string, at: number) {
  await tx.runAsync(
    `
    INSERT INTO local_metadata (key, value, updated_at) VALUES (?, ?, ?)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at
    `,
    [acknowledgedKey(listId), String(at), new Date(at).toISOString()]
  );
}

const SHOPPING_LIST_KINDS = [
  "shopping_list_item_add",
  "shopping_list_item_toggle",
  "shopping_list_item_update",
  "shopping_list_items_set_checked",
  "shopping_list_item_remove",
  "shopping_list_item_restore",
  "shopping_list_clear_checked",
  "shopping_list_recipe_batch",
];

type ListEdit = {
  kind: string;
  listId?: string;
  temporaryId?: string;
  itemId?: string;
  itemIds?: string[];
  checked?: boolean;
  clientMutationId?: string;
  changes?: {
    name?: string;
    amount?: number | string | null;
    displayQuantity?: string | null;
    unit?: string | null;
    category?: string | null;
  };
};

// Saves the server's copy of a list (QAD-01) and returns the list as saved,
// for screens to show. Edits still in the outbox win: they're applied, in
// order, on top of the server's copy, so items not created there yet stay,
// queued checks stay, queued removals stay removed, and an item an unsent
// edit is about stays even if the reply doesn't have it yet.
//
// `requestedAt` is when the reply was asked for. A reply asked for before
// the server last accepted an edit to this list may not show that edit, and
// once accepted the edit is no longer in the outbox to win, so the reply is
// ignored and the phone's copy stays.
export async function replaceListItemsKeepingPendingEdits(
  tx: SQLiteDatabase,
  listId: string,
  serverItems: ShoppingListItem[],
  { requestedAt }: { requestedAt?: number } = {}
) {
  const localRows = await tx.getAllAsync<ShoppingListItemRow>(
    "SELECT * FROM shopping_list_items WHERE list_id = ? ORDER BY created_at ASC",
    [listId]
  );
  const local = localRows.map(mapShoppingListRowToItem);

  if (requestedAt !== undefined) {
    const acknowledged = await tx.getFirstAsync<{ value: string }>(
      "SELECT value FROM local_metadata WHERE key = ?",
      [acknowledgedKey(listId)]
    );
    if (acknowledged && Number(acknowledged.value) > requestedAt) return local;
  }

  const operations = await tx.getAllAsync<{ kind: string; payload_json: string }>(
    `
    SELECT kind, payload_json FROM sync_queue
    WHERE kind IN (${SHOPPING_LIST_KINDS.map(() => "?").join(", ")})
    ORDER BY created_at ASC, rowid ASC
    `,
    SHOPPING_LIST_KINDS
  );
  const resolve = async (id: string) => (await resolveSyncIdMapping(tx, id, "shopping_list_item")) ?? id;
  const localById = new Map(local.map((item) => [item.id, item]));
  const items = new Map<string, ShoppingListItem>(serverItems.map((item) => [item.id, { ...item, listId }]));
  // The phone's copy of an item an unsent edit is about.
  const keep = (id: string) => {
    const copy = localById.get(id);
    if (!items.has(id) && copy) items.set(id, copy);
  };

  for (const operation of operations) {
    const edit = { kind: operation.kind, ...JSON.parse(operation.payload_json) } as ListEdit;
    if (edit.listId !== listId) continue;
    switch (edit.kind) {
      case "shopping_list_item_add":
        if (edit.temporaryId) keep(edit.temporaryId);
        break;
      case "shopping_list_recipe_batch":
        for (const item of local) if (item.recipeBatchId === edit.clientMutationId) keep(item.id);
        break;
      case "shopping_list_item_toggle":
      case "shopping_list_items_set_checked":
        for (const itemId of edit.itemIds ?? [edit.itemId!]) {
          const id = await resolve(itemId);
          keep(id);
          const item = items.get(id);
          if (item) items.set(id, { ...item, checked: edit.checked! });
        }
        break;
      case "shopping_list_item_update": {
        const id = await resolve(edit.itemId!);
        keep(id);
        const item = items.get(id);
        const changes = edit.changes ?? {};
        if (item) {
          items.set(id, {
            ...item,
            name: changes.name ?? item.name,
            quantity: changes.displayQuantity ?? item.quantity,
            amount: changes.amount == null ? item.amount : Number(changes.amount),
            displayQuantity: changes.displayQuantity ?? item.displayQuantity,
            unit: changes.unit ?? item.unit,
            category: changes.category ?? item.category,
          });
        }
        break;
      }
      case "shopping_list_item_remove":
        items.delete(await resolve(edit.itemId!));
        break;
      case "shopping_list_item_restore":
        keep(await resolve(edit.itemId!));
        break;
      case "shopping_list_clear_checked":
        for (const [id, item] of items) if (item.checked) items.delete(id);
        break;
    }
  }

  const saved = [...items.values()];
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
      recipe_batch_id,
      created_at,
      updated_at,
      list_id
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
      item.recipeBatchId ?? null,
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
