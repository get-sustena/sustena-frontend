// Shared by the app and its tests, so nothing here imports React Native.
import type { SQLiteDatabase } from "expo-sqlite";
import {
  deleteShoppingListItem,
  insertShoppingListItem,
  markListEditAcknowledged,
  replaceListItemsKeepingPendingEdits,
} from "../../db/shoppingItemRows.ts";
import { resolveSyncIdMapping, saveSyncIdMapping } from "../../db/syncIdMappingRepository.ts";
import type { SyncQueueOperation } from "../../db/syncQueueRepository.ts";
import { UnsendableChangeError } from "../sync/syncReplay.ts";
import type {
  ShoppingList,
  ShoppingListItem as ApiShoppingListItem,
  ShoppingListItemCreateRequest,
  ShoppingListItemUpdateRequest,
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
    payload: ShoppingListItemUpdateRequest
  ) => Promise<ApiShoppingListItem>;
  setShoppingListItemsChecked: (
    listId: string,
    itemIds: string[],
    checked: boolean
  ) => Promise<unknown>;
  deleteShoppingListItemFromList: (listId: string, itemId: string) => Promise<unknown>;
  restoreShoppingListItemInList: (listId: string, itemId: string) => Promise<ApiShoppingListItem>;
  clearCheckedShoppingListItems: (listId: string) => Promise<unknown>;
  addRecipesToShoppingList: (
    listId: string,
    payload: {
      clientMutationId: string;
      recipes: RecipeBatch["recipes"];
      lines?: { clientLineId: string; recipeId: string; recipeIngredientId: string }[];
    }
  ) => Promise<Pick<ShoppingList, "items"> & { lineItems?: { clientLineId: string; itemId: string | null }[] }>;
};

type Dependencies = {
  api: ShoppingApi;
  toLocalItem: (item: ApiShoppingListItem) => ShoppingListItem;
  // Runs `work` in one SQLite transaction (the app's runWriteTransaction).
  transact: <T>(work: (db: SQLiteDatabase) => Promise<T>) => Promise<T>;
  // Milliseconds, for when the server last accepted an edit to a list.
  now: () => number;
};

type RecipeBatch = {
  listId: string;
  clientMutationId: string;
  recipes: { recipeId: string; servings: number; unitOverrides?: { ingredientId: string; unit: string }[] }[];
  // The items the phone showed for the batch. Missing from batches queued by
  // an older version of the app.
  lines?: BatchLine[];
};

type BatchLine = {
  id: string;
  recipeId?: string | null;
  recipeIngredientId?: string | null;
  ingredientId: string | null;
};

// The server's row for each line the phone showed (F03). The server says
// where each line landed; several lines can share a row it merged them
// into. A server from before that answer leaves only one safe match: the
// line's catalogue ingredient on exactly one row. Nothing is matched by
// name: two rows can share a name.
function serverRowsFor(
  lines: BatchLine[],
  items: ApiShoppingListItem[],
  lineItems: { clientLineId: string; itemId: string | null }[] | undefined
) {
  const rows = new Map<string, string>();
  if (lineItems?.length) {
    for (const { clientLineId, itemId } of lineItems) if (itemId) rows.set(clientLineId, itemId);
    return rows;
  }
  for (const line of lines) {
    const matches = line.ingredientId ? items.filter((item) => item.ingredientId === line.ingredientId) : [];
    if (matches.length === 1) rows.set(line.id, matches[0].id);
  }
  return rows;
}

// Sends one shopping command from the outbox (shoppingCommands.ts).
// Returns false for commands it doesn't handle.
export async function runShoppingCommand(
  db: SQLiteDatabase,
  operation: SyncQueueOperation,
  { api, toLocalItem, transact, now }: Dependencies
) {
  const payload = operation.payload as { listId: string; itemId?: string };
  // An edit that waited for its item to be created goes to the server's row
  // for it. With no row known, it's kept for review rather than sent to a
  // guess (F03).
  const resolve = async (id: string) => {
    const serverId = await resolveSyncIdMapping(db, id, "shopping_list_item");
    if (serverId) return serverId;
    if (operation.dependsOn) throw new UnsendableChangeError("This item's row on your list can't be found.");
    return id;
  };
  const acknowledge = (tx: SQLiteDatabase) => markListEditAcknowledged(tx, payload.listId, now());

  switch (operation.kind) {
    case "shopping_list_item_add": {
      const { listId, temporaryId, ...request } = operation.payload as {
        listId: string;
        temporaryId?: string;
      } & ShoppingListItemCreateRequest;
      const created = await api.addShoppingListItemToList(listId, request);
      // The server's copy replaces the temporary one, keeping a check made
      // on the device meanwhile: its own command sends that next. An item
      // removed meanwhile stays removed: its removal is queued too.
      await transact(async (tx) => {
        if (temporaryId) {
          const local = await tx.getFirstAsync<{ checked: number }>(
            "SELECT checked FROM shopping_list_items WHERE id = ?",
            [temporaryId]
          );
          await saveSyncIdMapping(tx, temporaryId, created.id, "shopping_list_item");
          await deleteShoppingListItem(tx, temporaryId);
          if (local) {
            await insertShoppingListItem(tx, { ...toLocalItem(created), listId, checked: local.checked === 1 });
          }
        }
        await acknowledge(tx);
      });
      return true;
    }

    case "shopping_list_recipe_batch": {
      const { listId, clientMutationId, recipes, lines = [] } = operation.payload as RecipeBatch;
      const sentLines = lines.flatMap((line) =>
        line.recipeId && line.recipeIngredientId
          ? [{ clientLineId: line.id, recipeId: line.recipeId, recipeIngredientId: line.recipeIngredientId }]
          : []
      );
      const updated = await api.addRecipesToShoppingList(listId, {
        clientMutationId,
        recipes,
        ...(sentLines.length ? { lines: sentLines } : {}),
      });
      const serverItems = updated.items.filter((item) => !item.deletedAt);
      // Each line the phone showed now points at the server's row, so
      // checks and removals queued for it reach that row; the server's rows
      // replace the phone's.
      await transact(async (tx) => {
        for (const [lineId, itemId] of serverRowsFor(lines, serverItems, updated.lineItems)) {
          await saveSyncIdMapping(tx, lineId, itemId, "shopping_list_item");
        }
        await tx.runAsync(
          "DELETE FROM shopping_list_items WHERE list_id = ? AND recipe_batch_id = ?",
          [listId, clientMutationId]
        );
        await replaceListItemsKeepingPendingEdits(
          tx,
          listId,
          serverItems.map((item) => ({ ...toLocalItem(item), listId }))
        );
        await acknowledge(tx);
      });
      return true;
    }

    case "shopping_list_item_toggle": {
      const { listId, itemId, checked } = operation.payload as { listId: string; itemId: string; checked: boolean };
      await api.updateShoppingListItemInList(listId, await resolve(itemId), { checked });
      await transact(acknowledge);
      return true;
    }

    case "shopping_list_item_update": {
      const { listId, itemId, changes } = operation.payload as {
        listId: string;
        itemId: string;
        changes: ShoppingListItemUpdateRequest;
      };
      const updated = await api.updateShoppingListItemInList(listId, await resolve(itemId), changes);
      await transact(async (tx) => {
        const local = await tx.getFirstAsync<{ checked: number }>(
          "SELECT checked FROM shopping_list_items WHERE id = ?",
          [updated.id]
        );
        await insertShoppingListItem(tx, {
          ...toLocalItem(updated),
          listId,
          checked: local ? local.checked === 1 : updated.checked,
        });
        await acknowledge(tx);
      });
      return true;
    }

    case "shopping_list_items_set_checked": {
      const { listId, itemIds, checked } = operation.payload as { listId: string; itemIds: string[]; checked: boolean };
      await api.setShoppingListItemsChecked(listId, await Promise.all(itemIds.map(resolve)), checked);
      await transact(acknowledge);
      return true;
    }

    case "shopping_list_item_remove": {
      const id = await resolve(payload.itemId!);
      await api.deleteShoppingListItemFromList(payload.listId, id);
      await transact(async (tx) => {
        await deleteShoppingListItem(tx, id);
        await acknowledge(tx);
      });
      return true;
    }

    case "shopping_list_item_restore": {
      const restored = await api.restoreShoppingListItemInList(payload.listId, await resolve(payload.itemId!));
      await transact(async (tx) => {
        await insertShoppingListItem(tx, { ...toLocalItem(restored), listId: payload.listId });
        await acknowledge(tx);
      });
      return true;
    }

    case "shopping_list_clear_checked": {
      await api.clearCheckedShoppingListItems(payload.listId);
      await transact(acknowledge);
      return true;
    }

    default:
      return false;
  }
}
