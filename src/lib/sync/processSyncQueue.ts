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
import {
  ShoppingListItemCreateRequest,
  PlannerSettingsUpdateRequest,
  UserProfileAnswersUpdateRequest,
} from "../../types/api";

const MAX_ATTEMPTS = 8;

export async function processSyncQueue(db: SQLiteDatabase) {
  const operations = await getPendingSyncOperations(db);

  for (const operation of operations) {
    try {
      await runOperation(operation);
      await deleteSyncOperation(db, operation.id);
    } catch (error) {
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

async function runOperation(operation: SyncQueueOperation) {
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
      const { listId, ...payload } = operation.payload as {
        listId: string;
      } & ShoppingListItemCreateRequest;
      await shoppingListsApi.addShoppingListItemToList(listId, payload);
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

    default:
      return;
  }
}

function isUnrecoverable(error: unknown) {
  if (!isApiClientError(error)) {
    return false;
  }

  // A definitive 4xx (other than timeout/rate-limit) means the target
  // resource is gone or was never created server-side — retrying won't help,
  // most commonly a toggle/delete queued for an item that was created while
  // offline and never itself reached the server.
  return (
    error.status >= 400 &&
    error.status < 500 &&
    error.status !== 408 &&
    error.status !== 429
  );
}
