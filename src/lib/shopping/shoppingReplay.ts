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
import type {
  ShoppingList,
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
  deleteShoppingListItemFromList: (listId: string, itemId: string) => Promise<unknown>;
  restoreShoppingListItemInList: (listId: string, itemId: string) => Promise<ApiShoppingListItem>;
  clearCheckedShoppingListItems: (listId: string) => Promise<unknown>;
  addRecipesToShoppingList: (
    listId: string,
    payload: { clientMutationId: string; recipes: RecipeBatch["recipes"] }
  ) => Promise<Pick<ShoppingList, "items">>;
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
  lines?: { id: string; ingredientId: string | null; name: string }[];
};

const sameName = (a: string | null | undefined, b: string | null | undefined) =>
  Boolean(a && b && a.trim().toLowerCase() === b.trim().toLowerCase());

// The server's row for a line the phone made for a recipe: the same
// ingredient, or failing that the same name. The server merges a line into
// a row it already has, so several lines can point at one row (F03).
function serverRowFor(line: NonNullable<RecipeBatch["lines"]>[number], items: ApiShoppingListItem[]) {
  return (
    (line.ingredientId ? items.find((item) => item.ingredientId === line.ingredientId) : undefined) ??
    items.find((item) => sameName(item.name, line.name) || sameName(item.canonicalIngredientName, line.name))
  );
}

// Sends one shopping command from the outbox (shoppingCommands.ts).
// Returns false for commands it doesn't handle.
export async function runShoppingCommand(
  db: SQLiteDatabase,
  operation: SyncQueueOperation,
  { api, toLocalItem, transact, now }: Dependencies
) {
  const payload = operation.payload as { listId: string; itemId?: string };
  const resolve = async (id: string) => (await resolveSyncIdMapping(db, id, "shopping_list_item")) ?? id;
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
      const updated = await api.addRecipesToShoppingList(listId, { clientMutationId, recipes });
      const serverItems = updated.items.filter((item) => !item.deletedAt);
      // Each line the phone showed now points at the server's row, so
      // checks and removals queued for it reach that row; the server's rows
      // replace the phone's.
      await transact(async (tx) => {
        for (const line of lines) {
          const row = serverRowFor(line, serverItems);
          if (row) await saveSyncIdMapping(tx, line.id, row.id, "shopping_list_item");
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
