// Reads and writes of shopping_lists that run inside callers' transactions.
// Shared by the app and its tests, so nothing here imports React Native.
import type { SQLiteDatabase } from "expo-sqlite";
import { DEFAULT_SHOPPING_LIST_ID, type ShoppingListMeta } from "../types/shoppingList.ts";
import { resolveSyncIdMapping } from "./syncIdMappingRepository.ts";

type ShoppingListRow = {
  id: string;
  name: string;
  is_default_synced_list: number;
  created_at: string;
  updated_at: string;
};

export function mapShoppingListRow(row: ShoppingListRow): ShoppingListMeta {
  return {
    id: row.id,
    name: row.name,
    isDefaultSyncedList: Boolean(row.is_default_synced_list),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function saveShoppingListRow(tx: SQLiteDatabase, list: ShoppingListMeta) {
  await tx.runAsync(
    `
    INSERT INTO shopping_lists (id, name, is_default_synced_list, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      name = excluded.name,
      is_default_synced_list = excluded.is_default_synced_list,
      updated_at = excluded.updated_at
    `,
    [list.id, list.name, list.isDefaultSyncedList ? 1 : 0, list.createdAt, list.updatedAt]
  );
}

// A list and its items gone from the phone.
export async function deleteShoppingListRows(tx: SQLiteDatabase, listId: string) {
  await tx.runAsync("DELETE FROM shopping_list_items WHERE list_id = ?", [listId]);
  await tx.runAsync("DELETE FROM shopping_lists WHERE id = ?", [listId]);
}

// After the active list is deleted, the server makes the list touched most
// recently active: the later of its own and its newest item's updatedAt,
// then the newest createdAt, then the higher id (SL-07). The phone does the
// same, so it agrees offline.
export async function activateMostRecentlyTouchedList(tx: SQLiteDatabase) {
  await tx.runAsync(
    `
    UPDATE shopping_lists SET is_default_synced_list = 1
    WHERE id = (
      SELECT list.id FROM shopping_lists AS list
      LEFT JOIN (
        SELECT list_id, MAX(updated_at) AS item_updated_at FROM shopping_list_items GROUP BY list_id
      ) AS item ON item.list_id = list.id
      ORDER BY MAX(list.updated_at, COALESCE(item.item_updated_at, '')) DESC, list.created_at DESC, list.id DESC
      LIMIT 1
    )
    `
  );
}

const LIST_KINDS = ["shopping_list_create", "shopping_list_rename", "shopping_list_delete"];

// Saves the server's lists (QAD-01) and returns them as saved. List edits
// still in the outbox win, in order: a list made on the phone stays, a
// rename stays, a list being deleted stays hidden. A list the server no
// longer has, and nothing waits on, goes with its items.
export async function replaceListsKeepingPendingEdits(tx: SQLiteDatabase, serverLists: ShoppingListMeta[]) {
  const localRows = await tx.getAllAsync<ShoppingListRow>("SELECT * FROM shopping_lists");
  const local = new Map(localRows.map((row) => [row.id, mapShoppingListRow(row)]));
  const lists = new Map(serverLists.map((list) => [list.id, list]));
  const resolve = async (id: string) => (await resolveSyncIdMapping(tx, id, "shopping_list")) ?? id;
  const keep = (id: string) => {
    const copy = local.get(id);
    if (!lists.has(id) && copy) lists.set(id, copy);
  };

  const operations = await tx.getAllAsync<{ kind: string; payload_json: string }>(
    `
    SELECT kind, payload_json FROM sync_queue
    WHERE kind IN (${LIST_KINDS.map(() => "?").join(", ")})
    ORDER BY created_at ASC, rowid ASC
    `,
    LIST_KINDS
  );
  for (const operation of operations) {
    const payload = JSON.parse(operation.payload_json) as { listId: string; name?: string };
    const id = await resolve(payload.listId);
    if (operation.kind === "shopping_list_delete") {
      lists.delete(id);
      continue;
    }
    keep(id);
    const list = lists.get(id);
    if (operation.kind === "shopping_list_rename" && list && payload.name) {
      lists.set(id, { ...list, name: payload.name });
    }
  }

  // The phone's own starting list stays only while it holds items; once the
  // server's lists are here, an empty one would just be a list nobody made.
  for (const [id, list] of local) {
    if (lists.has(id) || id !== DEFAULT_SHOPPING_LIST_ID) continue;
    const item = await tx.getFirstAsync("SELECT id FROM shopping_list_items WHERE list_id = ? LIMIT 1", [id]);
    if (item) lists.set(id, list);
  }
  for (const id of local.keys()) {
    if (!lists.has(id)) await deleteShoppingListRows(tx, id);
  }
  for (const list of lists.values()) await saveShoppingListRow(tx, list);
  return [...lists.values()];
}
