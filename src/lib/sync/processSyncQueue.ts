// src/lib/sync/processSyncQueue.ts

import { type SQLiteDatabase } from "expo-sqlite";
import {
  deleteSyncOperation,
  getPendingSyncOperations,
  incrementSyncAttempt,
  SyncQueueOperation,
} from "../../db/syncQueueRepository";
import {
  favoritesApi,
  plannerApi,
  profileAnswersApi,
  shoppingListApi,
  shoppingListsApi,
} from "../api";
import { isApiClientError } from "../api/errors";
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

const MAX_ATTEMPTS = 8;

export async function processSyncQueue(db: SQLiteDatabase) {
  const operations = await getPendingSyncOperations(db);

  for (const operation of operations) {
    if (useAuthStore.getState().isSigningOut) return;

    try {
      const payload = operation.payload as Record<string, unknown>;
      if (typeof payload.itemId === "string") {
        payload.itemId =
          (await resolveSyncIdMapping(
            db,
            payload.itemId,
            "shopping_list_item"
          )) ?? payload.itemId;
      }
      await runOperation(operation, db);
      await deleteSyncOperation(db, operation.id);
    } catch (error) {
      if (useAuthStore.getState().isSigningOut) return;

      if (isUnrecoverable(error) || operation.attempts + 1 >= MAX_ATTEMPTS) {
        console.warn(
          "Dropping queued change that could not be synced",
          operation.kind,
          error
        );
        await deleteSyncOperation(db, operation.id);
        continue;
      }

      await incrementSyncAttempt(db, operation.id);
    }
  }
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

function isUnrecoverable(error: unknown) {
  if (!isApiClientError(error)) {
    return false;
  }

  // A definitive 4xx (other than timeout/rate-limit) means the target
  // resource is gone or was never created server-side. Retrying won't help,
  // most commonly a toggle/delete queued for an item that was created while
  // offline and never itself reached the server.
  return (
    error.status >= 400 &&
    error.status < 500 &&
    error.status !== 408 &&
    error.status !== 429
  );
}
