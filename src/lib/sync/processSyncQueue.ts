import { onlineManager } from "@tanstack/react-query";
import { type SQLiteDatabase } from "expo-sqlite";
import { resolveSyncIdMapping } from "../../db/syncIdMappingRepository";
import type { SyncQueueOperation } from "../../db/syncQueueRepository";
import { runWriteTransaction } from "../../db/writeTransaction";
import { useAuthStore } from "../../store/authStore";
import { ShoppingListItemCreateRequest } from "../../types/api";
import {
  creatorsApi,
  favoritesApi,
  mealPlansApi,
  plannerApi,
  preferencesApi,
  profileAnswersApi,
  recipesApi,
  shoppingListApi,
  shoppingListsApi,
} from "../api";
import { apiShoppingItemToLocalItem } from "../api/adapters";
import { runCookedCommand } from "../cooked/cookedCommands";
import { runFollowCommand } from "../creators/followCommands";
import { runFavoriteCommand } from "../favorites/favoriteCommands";
import { queryClient } from "../query/queryClient";
import { runRatingCommand } from "../ratings/ratingCommands";
import { followSent, ratingSent } from "../social/sentChanges";
import { queryKeys } from "../query/queryKeys";
import { runSettingsCommand } from "../settings/settingsCommands";
import { runPlanCommand } from "../planner/planCommands";
import { runListCommand } from "../shopping/listCommands";
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
  const listHandled = await runListCommand(db, operation, {
    api: {
      createShoppingList: shoppingListsApi.createShoppingList,
      updateShoppingListById: shoppingListsApi.updateShoppingListById,
      deleteShoppingListById: shoppingListsApi.deleteShoppingListById,
    },
    transact: (work) => runWriteTransaction(db, work),
  });
  if (listHandled) return;
  const planHandled = await runPlanCommand(db, operation, {
    api: {
      createMealPlan: mealPlansApi.createMealPlan,
      swapMealPlanItems: mealPlansApi.swapMealPlanItems,
      renameMealPlan: mealPlansApi.renameMealPlan,
      deleteMealPlan: mealPlansApi.deleteMealPlan,
    },
    transact: (work) => runWriteTransaction(db, work),
  });
  if (planHandled) return;

  const handled = await runShoppingCommand(db, operation, {
    api: {
      addShoppingListItemToList: shoppingListsApi.addShoppingListItemToList,
      updateShoppingListItemInList: shoppingListsApi.updateShoppingListItemInList,
      setShoppingListItemsChecked: shoppingListsApi.setShoppingListItemsChecked,
      deleteShoppingListItemFromList: shoppingListsApi.deleteShoppingListItemFromList,
      restoreShoppingListItemInList: shoppingListsApi.restoreShoppingListItemInList,
      clearCheckedShoppingListItems: shoppingListsApi.clearCheckedShoppingListItems,
      addRecipesToShoppingList: shoppingListsApi.addRecipesToShoppingList,
    },
    toLocalItem: apiShoppingItemToLocalItem,
    transact: (work) => runWriteTransaction(db, work),
    now: () => Date.now(),
  });
  if (handled) return;
  if (
    await runFavoriteCommand(operation, {
      addFavorite: favoritesApi.addFavorite,
      removeFavorite: favoritesApi.removeFavorite,
    })
  ) {
    return;
  }
  if (await runCookedCommand(operation, { markRecipeCooked: recipesApi.markRecipeCooked })) return;
  if (
    await runFollowCommand(operation, {
      saveCreator: creatorsApi.saveCreator,
      unsaveCreator: creatorsApi.unsaveCreator,
    })
  ) {
    const { creatorId } = operation.payload as { creatorId: string };
    followSent(creatorId, operation.kind === "creator_follow");
    return;
  }
  if (await runRatingCommand(operation, { rateRecipe: recipesApi.rateRecipe })) {
    const { recipeId, rating } = operation.payload as { recipeId: string; rating: number };
    ratingSent(recipeId, rating);
    return;
  }
  if (
    await runSettingsCommand(operation, {
      updatePreferences: preferencesApi.updatePreferences,
      updateProfileAnswers: profileAnswersApi.updateProfileAnswers,
      updatePlannerSettings: plannerApi.updatePlannerSettings,
    })
  ) {
    // Recommendations follow preferences and profile answers.
    await queryClient.invalidateQueries({ queryKey: queryKeys.recommendations.home });
    return;
  }

  // Older edits may name an item by the temporary id it had when queued.
  const payload = operation.payload as Record<string, unknown>;
  if (typeof payload.itemId === "string") {
    payload.itemId =
      (await resolveSyncIdMapping(db, payload.itemId, "shopping_list_item")) ?? payload.itemId;
  }

  switch (operation.kind) {
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

    default:
      return;
  }
}
