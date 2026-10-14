
import { onlineManager } from "@tanstack/react-query";
import { type SQLiteDatabase } from "expo-sqlite";
import {
  deleteSyncOperation,
  getPendingSyncOperations,
  markSyncNeedsAttention,
  scheduleSyncRetry,
  SyncQueueOperation,
} from "../../db/syncQueueRepository";
import { replayQueue } from "./syncReplay";
import {
  favoritesApi,
  plannerApi,
  profileAnswersApi,
  shoppingListApi,
  shoppingListsApi,
} from "../api";
import { apiShoppingItemToLocalItem } from "../api/adapters";
import {
  deleteShoppingListItem,
  insertShoppingListItem,
  replaceShoppingListItemsForList,
} from "../../db/shoppingListRepository";
import {
  resolveSyncIdMapping,
  saveSyncIdMapping,
} from "../../db/syncIdMappingRepository";
import {
  ShoppingListItemCreateRequest,
  PlannerSettingsUpdateRequest,
  UserProfileAnswersUpdateRequest,
} from "../../types/api";
import { useAuthStore } from "../../store/authStore";

// Replays queued offline edits (rules in syncReplay.ts). `reconnected` is
// set when the connection has just come back, so edits waiting out a
// backoff are tried at once.
export async function processSyncQueue(db: SQLiteDatabase, { reconnected = false } = {}) {
  await replayQueue(
    {
      pending: () => getPendingSyncOperations(db),
      run: async (operation) => {
        const payload = operation.payload as Record<string, unknown>;
        if (typeof payload.itemId === "string") {
          payload.itemId =
            (await resolveSyncIdMapping(db, payload.itemId, "shopping_list_item")) ??
            payload.itemId;
        }
        await runOperation(operation, db);
      },
      remove: (id) => deleteSyncOperation(db, id),
      scheduleRetry: (id, nextAttemptAt) => scheduleSyncRetry(db, id, nextAttemptAt),
      markNeedsAttention: (id, reason) => markSyncNeedsAttention(db, id, reason),
    },
    {
      isOnline: () => onlineManager.isOnline(),
      isStopped: () => useAuthStore.getState().isSigningOut,
      now: () => Date.now(),
      ignoreBackoff: reconnected,
    }
  );
}

async function runOperation(operation: SyncQueueOperation, db: SQLiteDatabase) {
  switch (operation.kind) {
    case "favorite_add": {
      const { recipeId } = operation.payload as { recipeId: string };
      await favoritesApi.addFavorite(recipeId);
      return;
    }

    case "favorite_remove": {
      const { recipeId } = operation.payload as { recipeId: string };
      await favoritesApi.removeFavorite(recipeId);
      return;
    }

    case "shopping_toggle": {
      const { itemId, checked } = operation.payload as {
        itemId: string;
        checked: boolean;
      };
      await shoppingListApi.updateShoppingListItem(itemId, { checked });
      return;
    }

    case "shopping_clear_checked": {
      await shoppingListApi.clearCheckedShoppingListItems();
      return;
    }

    case "shopping_add": {
      await shoppingListApi.addShoppingListItem(
        operation.payload as ShoppingListItemCreateRequest
      );
      return;
    }

    case "shopping_remove": {
      const { itemId } = operation.payload as { itemId: string };
      await shoppingListApi.deleteShoppingListItem(itemId);
      return;
    }

    case "profile_answers_update": {
      await profileAnswersApi.updateProfileAnswers(
        operation.payload as UserProfileAnswersUpdateRequest
      );
      return;
    }

    case "planner_settings_update": {
      await plannerApi.updatePlannerSettings(
        operation.payload as PlannerSettingsUpdateRequest
      );
      return;
    }

    case "shopping_list_item_add": {
      const { listId, temporaryId, ...payload } = operation.payload as {
        listId: string;
        temporaryId?: string;
      } & ShoppingListItemCreateRequest;
      const created = await shoppingListsApi.addShoppingListItemToList(listId, payload);
      if (temporaryId) {
        await saveSyncIdMapping(
          db,
          temporaryId,
          created.id,
          "shopping_list_item"
        );
        await deleteShoppingListItem(db, temporaryId);
        await insertShoppingListItem(db, {
          ...apiShoppingItemToLocalItem(created),
          listId,
        });
      }
      return;
    }

    case "shopping_list_item_toggle": {
      const { listId, itemId, checked } = operation.payload as {
        listId: string;
        itemId: string;
        checked: boolean;
      };
      await shoppingListsApi.updateShoppingListItemInList(listId, itemId, {
        checked,
      });
      return;
    }

    case "shopping_list_item_remove": {
      const { listId, itemId } = operation.payload as {
        listId: string;
        itemId: string;
      };
      await shoppingListsApi.deleteShoppingListItemFromList(listId, itemId);
      return;
    }

    case "shopping_list_recipe_batch": {
      const { listId, ...payload } = operation.payload as {
        listId: string;
        clientMutationId: string;
        recipes: { recipeId: string; servings: number }[];
      };
      const updatedList = await shoppingListsApi.addRecipesToShoppingList(
        listId,
        payload
      );
      const items = updatedList.items.map((item) => ({
        ...apiShoppingItemToLocalItem(item),
        listId,
      }));
      await replaceShoppingListItemsForList(db, listId, items);
      return;
    }

    default:
      return;
  }
}
