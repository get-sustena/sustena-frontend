// src/hooks/useAppBootstrap.ts

import { useSQLiteContext } from "expo-sqlite";
import { useEffect, useState } from "react";
import {
  getStoredFavorites,
  mapFavoriteRowToFavorite,
} from "../db/favoritesRepository";
import {
  getStoredProfileAnswers,
  mapStoredProfileAnswersRow,
} from "../db/localProfileAnswersRepository";
import {
  getStoredPreferences,
  mapStoredPreferencesRow,
  saveStoredPreferences,
} from "../db/preferencesRepository";
import {
  getStoredPlannerSettings,
  mapStoredPlannerSettings,
} from "../db/plannerSettingsRepository";
import {
  getStoredShoppingListItems,
  mapShoppingListRowToItem,
} from "../db/shoppingListRepository";
import {
  getStoredShoppingLists,
  mapShoppingListRowToMeta,
} from "../db/shoppingListsRepository";
import { seedPublishedRecipesIfNeeded } from "../db/recipeRepository";
import { useFavoritesStore } from "../store/favoritesStore";
import { usePreferencesStore } from "../store/preferencesStore";
import { usePlannerStore } from "../store/plannerStore";
import { useProfileAnswersStore } from "../store/profileAnswersStore";
import { useShoppingListStore } from "../store/shoppingListStore";
import { useShoppingListsStore } from "../store/shoppingListsStore";
import { DEFAULT_SHOPPING_LIST_ID } from "../types/shoppingList";

export function useAppBootstrap() {
  const db = useSQLiteContext();

  const [isBootstrapping, setIsBootstrapping] = useState(true);
  const [bootstrapError, setBootstrapError] = useState<string | null>(null);

  const hydratePreferences = usePreferencesStore(
    (state) => state.hydratePreferences
  );
  const hydrateShoppingItems = useShoppingListStore(
    (state) => state.hydrateItems
  );

  const hydrateFavorites = useFavoritesStore((state) => state.hydrateFavorites);
  const hydrateProfileAnswers = useProfileAnswersStore(
    (state) => state.hydrateProfileAnswers
  );
  const hydratePlanSetup = usePlannerStore((state) => state.hydratePlanSetup);
  const hydrateShoppingLists = useShoppingListsStore(
    (state) => state.hydrateLists
  );

  useEffect(() => {
    let isMounted = true;

    async function bootstrap() {
      try {
        await seedPublishedRecipesIfNeeded(db);

        const storedPreferencesRow = await getStoredPreferences(db);
        const storedPreferences = mapStoredPreferencesRow(storedPreferencesRow);

        if (storedPreferences) {
          hydratePreferences(storedPreferences);
        } else {
          const currentPreferences = usePreferencesStore.getState();

          await saveStoredPreferences(db, {
            healthConditions: currentPreferences.healthConditions,
            dietaryPreference: currentPreferences.dietaryPreference,
            defaultUnitMode: currentPreferences.defaultUnitMode,
            defaultServingSize: currentPreferences.defaultServingSize,
            hapticsEnabled: currentPreferences.hapticsEnabled,
            dataSaverEnabled: currentPreferences.dataSaverEnabled,
            mealRemindersEnabled: currentPreferences.mealRemindersEnabled,
            hasCompletedOnboarding: currentPreferences.hasCompletedOnboarding,
          });
        }

        const storedShoppingItems = await getStoredShoppingListItems(
          db,
          DEFAULT_SHOPPING_LIST_ID
        );
        hydrateShoppingItems(storedShoppingItems.map(mapShoppingListRowToItem));
        const storedFavorites = await getStoredFavorites(db);
        hydrateFavorites(storedFavorites.map(mapFavoriteRowToFavorite));

        const storedProfileAnswersRow = await getStoredProfileAnswers(db);
        const storedProfileAnswers = mapStoredProfileAnswersRow(
          storedProfileAnswersRow
        );

        if (storedProfileAnswers) {
          hydrateProfileAnswers(storedProfileAnswers);
        }

        const storedPlannerSettings = mapStoredPlannerSettings(
          await getStoredPlannerSettings(db)
        );

        if (storedPlannerSettings) {
          hydratePlanSetup(storedPlannerSettings);
        }

        const storedShoppingLists = await getStoredShoppingLists(db);
        hydrateShoppingLists(storedShoppingLists.map(mapShoppingListRowToMeta));
      } catch (error) {
        console.error(error);

        if (isMounted) {
          setBootstrapError("Could not load local app data.");
        }
      } finally {
        if (isMounted) {
          setIsBootstrapping(false);
        }
      }
    }

    bootstrap();

    return () => {
      isMounted = false;
    };
  }, [
    db,
    hydrateFavorites,
    hydratePreferences,
    hydratePlanSetup,
    hydrateProfileAnswers,
    hydrateShoppingItems,
    hydrateShoppingLists,
  ]);

  return {
    isBootstrapping,
    bootstrapError,
  };
}
