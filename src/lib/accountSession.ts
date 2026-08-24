import type { SQLiteDatabase } from "expo-sqlite";
import {
  getStoredFavorites,
  mapFavoriteRowToFavorite,
} from "../db/favoritesRepository";
import {
  getStoredProfileAnswers,
  mapStoredProfileAnswersRow,
} from "../db/localProfileAnswersRepository";
import {
  getStoredPlannerSettings,
  mapStoredPlannerSettings,
} from "../db/plannerSettingsRepository";
import {
  getStoredPreferences,
  mapStoredPreferencesRow,
} from "../db/preferencesRepository";
import {
  getStoredShoppingListItems,
  mapShoppingListRowToItem,
} from "../db/shoppingListRepository";
import {
  getStoredShoppingLists,
  mapShoppingListRowToMeta,
} from "../db/shoppingListsRepository";
import { DEFAULT_PLAN_SETUP } from "../types/planner";
import { DEFAULT_SHOPPING_LIST_ID } from "../types/shoppingList";
import { useCreatorProfileEditStore } from "../store/creatorProfileEditStore";
import { useFavoritesStore } from "../store/favoritesStore";
import { usePlannerStore } from "../store/plannerStore";
import { usePreferencesStore } from "../store/preferencesStore";
import { useProfileAnswersStore } from "../store/profileAnswersStore";
import { useShoppingListStore } from "../store/shoppingListStore";
import { useShoppingListsStore } from "../store/shoppingListsStore";
import { closeSheet } from "../store/uiStore";

export function resetLocalAccountStores() {
  useShoppingListStore.getState().clearAllItems();
  useShoppingListsStore.setState({
    lists: [],
    activeListId: DEFAULT_SHOPPING_LIST_ID,
  });
  useFavoritesStore.getState().hydrateFavorites([]);
  usePreferencesStore.getState().resetPreferences();
  useProfileAnswersStore.getState().resetProfileAnswers();
  usePlannerStore.getState().hydratePlanSetup(DEFAULT_PLAN_SETUP);
  useCreatorProfileEditStore.getState().hydrate({
    displayName: "",
    handle: "",
    bio: "",
    avatarUrl: null,
    specialities: [],
  });
  closeSheet();
}

export async function hydrateLocalAccountStores(db: SQLiteDatabase) {
  resetLocalAccountStores();

  const [
    preferencesRow,
    shoppingItemRows,
    favoriteRows,
    profileAnswersRow,
    plannerSettingsRow,
    shoppingListRows,
  ] = await Promise.all([
    getStoredPreferences(db),
    getStoredShoppingListItems(db, DEFAULT_SHOPPING_LIST_ID),
    getStoredFavorites(db),
    getStoredProfileAnswers(db),
    getStoredPlannerSettings(db),
    getStoredShoppingLists(db),
  ]);

  const preferences = mapStoredPreferencesRow(preferencesRow);
  if (preferences) {
    usePreferencesStore.getState().hydratePreferences(preferences);
  }
  useShoppingListStore
    .getState()
    .hydrateItems(shoppingItemRows.map(mapShoppingListRowToItem));
  useFavoritesStore
    .getState()
    .hydrateFavorites(favoriteRows.map(mapFavoriteRowToFavorite));

  const profileAnswers = mapStoredProfileAnswersRow(profileAnswersRow);
  if (profileAnswers) {
    useProfileAnswersStore
      .getState()
      .hydrateProfileAnswers(profileAnswers);
  }

  const plannerSettings = mapStoredPlannerSettings(plannerSettingsRow);
  if (plannerSettings) {
    usePlannerStore.getState().hydratePlanSetup(plannerSettings);
  }
  useShoppingListsStore
    .getState()
    .hydrateLists(shoppingListRows.map(mapShoppingListRowToMeta));
}
