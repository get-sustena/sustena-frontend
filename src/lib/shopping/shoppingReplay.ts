// Shared by the app and its tests, so nothing here imports React Native.
import type { SQLiteDatabase } from "expo-sqlite";
import { deleteShoppingListItem, insertShoppingListItem } from "../../db/shoppingItemRows.ts";
import { resolveSyncIdMapping, saveSyncIdMapping } from "../../db/syncIdMappingRepository.ts";
import type { SyncQueueOperation } from "../../db/syncQueueRepository.ts";
import type {
  ShoppingListItem as ApiShoppingListItem,
  ShoppingListItemCreateRequest,
} from "../../types/api.ts";
import type { ShoppingListItem } from "../../types/shoppingList.ts";

type ShoppingApi = {
  addShoppingListItemToList: (
    listId: string,
    payload: ShoppingListItemCreateRequest
  ) => Promise<ApiShoppingListItem>;
  updateShoppingListItemInList: (
    listId: string,
    itemId: string,
    payload: { checked: boolean }
  ) => Promise<unknown>;
  setShoppingListItemsChecked: (
    listId: string,
    itemIds: string[],
    checked: boolean
  ) => Promise<unknown>;
};

type Dependencies = {
  api: ShoppingApi;
  toLocalItem: (item: ApiShoppingListItem) => ShoppingListItem;
  // Runs `work` in one SQLite transaction (the app's runWriteTransaction).
  transact: <T>(work: (db: SQLiteDatabase) => Promise<T>) => Promise<T>;
};

// Sends one shopping command from the outbox (shoppingCommands.ts).
// Returns false for commands it doesn't handle.
export async function runShoppingCommand(
  db: SQLiteDatabase,
  operation: SyncQueueOperation,
  { api, toLocalItem, transact }: Dependencies
) {
  switch (operation.kind) {
    case "shopping_list_item_add": {
      const { listId, temporaryId, ...payload } = operation.payload as {
        listId: string;
        temporaryId?: string;
      } & ShoppingListItemCreateRequest;
      const created = await api.addShoppingListItemToList(listId, payload);
      if (!temporaryId) return true;

      // The server's copy replaces the temporary one, keeping a check made
      // on the device meanwhile: its own command sends that next.
      await transact(async (tx) => {
        const local = await tx.getFirstAsync<{ checked: number }>(
          "SELECT checked FROM shopping_list_items WHERE id = ?",
          [temporaryId]
        );
        await saveSyncIdMapping(tx, temporaryId, created.id, "shopping_list_item");
        await deleteShoppingListItem(tx, temporaryId);
        await insertShoppingListItem(tx, {
          ...toLocalItem(created),
          listId,
          checked: local ? local.checked === 1 : created.checked,
        });
      });
      return true;
    }

    case "shopping_list_item_toggle": {
      const { listId, itemId, checked } = operation.payload as {
        listId: string;
        itemId: string;
        checked: boolean;
      };
      const serverId = (await resolveSyncIdMapping(db, itemId, "shopping_list_item")) ?? itemId;
      await api.updateShoppingListItemInList(listId, serverId, { checked });
      return true;
    }

    case "shopping_list_items_set_checked": {
      const { listId, itemIds, checked } = operation.payload as {
        listId: string;
        itemIds: string[];
        checked: boolean;
      };
      await api.setShoppingListItemsChecked(listId, itemIds, checked);
      return true;
    }

    default:
      return false;
  }
}
