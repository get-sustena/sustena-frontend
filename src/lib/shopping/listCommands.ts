// Making, renaming and deleting shopping lists, with or without a
// connection (QAD-04). Each change is saved on the phone with its outbox
// command in one transaction. Shared by the app and its tests, so nothing
// here imports React Native.
import type { SQLiteDatabase } from "expo-sqlite";
import {
  activateMostRecentlyTouchedList,
  deleteShoppingListRows,
  mapShoppingListRow,
  saveShoppingListRow,
} from "../../db/shoppingListRows.ts";
import { mapShoppingListRowToItem, insertShoppingListItem, type ShoppingListItemRow } from "../../db/shoppingItemRows.ts";
import { resolveSyncIdMapping, saveSyncIdMapping } from "../../db/syncIdMappingRepository.ts";
import { enqueueSyncOperation, type SyncQueueOperation } from "../../db/syncQueueRepository.ts";
import type { ShoppingListItem, ShoppingListMeta } from "../../types/shoppingList.ts";

type Dependencies = {
  db: SQLiteDatabase;
  // Runs `work` in one SQLite transaction (the app's runWriteTransaction).
  transact: <T>(work: (db: SQLiteDatabase) => Promise<T>) => Promise<T>;
  now: () => string;
  newId: (prefix: string) => string;
  // Asks the outbox to send what's queued now, if it can.
  requestSync: () => void;
};

// The queued creation a list edit waits for, if the list is still on its
// way to the server.
export async function pendingListCreation(tx: SQLiteDatabase, listId: string) {
  const creation = await tx.getFirstAsync<{ entity_id: string }>(
    "SELECT entity_id FROM sync_queue WHERE kind = 'shopping_list_create' AND entity_id = ? LIMIT 1",
    [listId]
  );
  return creation?.entity_id ?? null;
}

export function createListCommands({ transact, now, newId, requestSync }: Dependencies) {
  const resolve = async (tx: SQLiteDatabase, listId: string) =>
    (await resolveSyncIdMapping(tx, listId, "shopping_list")) ?? listId;

  return {
    // Shows at once under a temporary id; the outbox swaps in the server's
    // id, and moves the list's items with it.
    async createList({ name }: { name: string }) {
      const at = now();
      const list: ShoppingListMeta = {
        id: newId("shopping_list"),
        name: name.trim(),
        isDefaultSyncedList: false,
        createdAt: at,
        updatedAt: at,
      };
      await transact(async (tx) => {
        await saveShoppingListRow(tx, list);
        const clientMutationId = newId("list_mutation");
        await enqueueSyncOperation(
          tx,
          "shopping_list_create",
          { listId: list.id, name: list.name, clientMutationId },
          { mutationId: clientMutationId, entityId: list.id }
        );
      });
      requestSync();
      return list;
    },

    async renameList({ listId, name }: { listId: string; name: string }) {
      await transact(async (tx) => {
        const id = await resolve(tx, listId);
        await tx.runAsync("UPDATE shopping_lists SET name = ?, updated_at = ? WHERE id = ?", [name.trim(), now(), id]);
        await enqueueSyncOperation(
          tx,
          "shopping_list_rename",
          { listId: id, name: name.trim() },
          { mutationId: newId("list_mutation"), entityId: id, dependsOn: await pendingListCreation(tx, id) }
        );
      });
      requestSync();
    },

    // Gone from the phone at once, on any list (SL-07). The command keeps a
    // copy of the list and its items, so a delete the server refuses can put
    // them back.
    async deleteList({ listId }: { listId: string }) {
      await transact(async (tx) => {
        const id = await resolve(tx, listId);
        const list = await tx.getFirstAsync<Parameters<typeof mapShoppingListRow>[0]>(
          "SELECT * FROM shopping_lists WHERE id = ?",
          [id]
        );
        const items = await tx.getAllAsync<ShoppingListItemRow>("SELECT * FROM shopping_list_items WHERE list_id = ?", [id]);
        await deleteShoppingListRows(tx, id);
        if (list?.is_default_synced_list) await activateMostRecentlyTouchedList(tx);
        await enqueueSyncOperation(
          tx,
          "shopping_list_delete",
          {
            listId: id,
            copy: list ? { list: mapShoppingListRow(list), items: items.map(mapShoppingListRowToItem) } : null,
          },
          { mutationId: newId("list_mutation"), entityId: id, dependsOn: await pendingListCreation(tx, id) }
        );
      });
      requestSync();
    },
  };
}

type ListsApi = {
  createShoppingList: (payload: { name: string; clientMutationId: string }) => Promise<{ id: string }>;
  updateShoppingListById: (listId: string, payload: { name: string }) => Promise<unknown>;
  deleteShoppingListById: (listId: string) => Promise<unknown>;
};

type Replay = {
  api: ListsApi;
  transact: <T>(work: (db: SQLiteDatabase) => Promise<T>) => Promise<T>;
};

const statusOf = (error: unknown) =>
  typeof error === "object" && error !== null && "status" in error ? Number((error as { status: unknown }).status) : 0;

// A refusal the same request will always get again (not offline, sign-in,
// rate limits or server errors).
const isRefusal = (status: number) => status >= 400 && status < 500 && ![401, 408, 429].includes(status);

// Sends one list command from the outbox. Returns false for commands it
// doesn't handle.
export async function runListCommand(db: SQLiteDatabase, operation: SyncQueueOperation, { api, transact }: Replay) {
  const payload = operation.payload as {
    listId: string;
    name?: string;
    clientMutationId?: string;
    copy?: { list: ShoppingListMeta; items: ShoppingListItem[] } | null;
  };
  const listId = (await resolveSyncIdMapping(db, payload.listId, "shopping_list")) ?? payload.listId;

  switch (operation.kind) {
    case "shopping_list_create": {
      const created = await api.createShoppingList({ name: payload.name!, clientMutationId: payload.clientMutationId! });
      // The list and everything added to it move to the server's id.
      await transact(async (tx) => {
        await saveSyncIdMapping(tx, payload.listId, created.id, "shopping_list");
        await tx.runAsync("UPDATE shopping_lists SET id = ? WHERE id = ?", [created.id, payload.listId]);
        await tx.runAsync("UPDATE shopping_list_items SET list_id = ? WHERE list_id = ?", [created.id, payload.listId]);
      });
      return true;
    }

    case "shopping_list_rename":
      await api.updateShoppingListById(listId, { name: payload.name! });
      return true;

    case "shopping_list_delete":
      try {
        await api.deleteShoppingListById(listId);
      } catch (error) {
        const status = statusOf(error);
        // Already gone counts as done.
        if (status === 404) return true;
        if (!isRefusal(status)) throw error;
        // Refused, such as the only list: it comes back as it was.
        if (payload.copy) {
          const { list, items } = payload.copy;
          await transact(async (tx) => {
            // It was the active list: it's the only active one again.
            if (list.isDefaultSyncedList) await tx.runAsync("UPDATE shopping_lists SET is_default_synced_list = 0");
            await saveShoppingListRow(tx, { ...list, id: listId });
            for (const item of items) await insertShoppingListItem(tx, { ...item, listId });
          });
        }
      }
      return true;

    default:
      return false;
  }
}
