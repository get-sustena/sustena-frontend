import { onlineManager } from "@tanstack/react-query";
import { type SQLiteDatabase } from "expo-sqlite";
import { replaceShoppingListItemsForList } from "../../db/shoppingListRepository";
import { resolveSyncIdMapping } from "../../db/syncIdMappingRepository";
import type { SyncQueueOperation } from "../../db/syncQueueRepository";
import { runWriteTransaction } from "../../db/writeTransaction";
import { useAuthStore } from "../../store/authStore";
import {
  PlannerSettingsUpdateRequest,
  ShoppingListItemCreateRequest,
  UserProfileAnswersUpdateRequest,
} from "../../types/api";
import {
  favoritesApi,
  plannerApi,
  profileAnswersApi,
  shoppingListApi,
  shoppingListsApi,
} from "../api";
import { apiShoppingItemToLocalItem } from "../api/adapters";
import { runShoppingCommand } from "../shopping/shoppingReplay";
import { replayOutbox } from "./outboxReplay";

export async function processSyncQueue(db: SQLiteDatabase, { reconnected = false } = {}) {
  await replayOutbox(db, runOperation, {
    isOnline: () => onlineManager.isOnline(),
    isStopped: () => useAuthStore.getState().isSigningOut,
    now: () => Date.now(),
    ignoreBackoff: reconnected,
  });
}

async function runOperation(db: SQLiteDatabase, operation: SyncQueueOperation) {
  const handled = await runShoppingCommand(db, operation, {
    api: {
      addShoppingListItemToList: shoppingListsApi.addShoppingListItemToList,
      updateShoppingListItemInList: shoppingListsApi.updateShoppingListItemInList,
      setShoppingListItemsChecked: shoppingListsApi.setShoppingListItemsChecked,
    },
    toLocalItem: apiShoppingItemToLocalItem,
    transact: (work) => runWriteTransaction(db, work),
  });
  if (handled) return;

  // Older edits may name an item by the temporary id it had when queued.
  const payload = operation.payload as Record<string, unknown>;
  if (typeof payload.itemId === "string") {
    payload.itemId =
      (await resolveSyncIdMapping(db, payload.itemId, "shopping_list_item")) ?? payload.itemId;
  }

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
