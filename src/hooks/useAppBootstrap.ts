// src/hooks/useAppBootstrap.ts

import { useSQLiteContext } from "expo-sqlite";
import { useEffect, useState } from "react";
import {
  getStoredFavorites,
  mapFavoriteRowToFavorite,
} from "../db/favoritesRepository";
import {
  getStoredPreferences,
  mapStoredPreferencesRow,
  saveStoredPreferences,
} from "../db/preferencesRepository";
import {
  getStoredShoppingListItems,
  mapShoppingListRowToItem,
} from "../db/shoppingListRepository";
import { useFavoritesStore } from "../store/favoritesStore";
import { usePreferencesStore } from "../store/preferencesStore";
import { useShoppingListStore } from "../store/shoppingListStore";

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

  useEffect(() => {
    let isMounted = true;

    async function bootstrap() {
      try {
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

        const storedShoppingItems = await getStoredShoppingListItems(db);
        hydrateShoppingItems(storedShoppingItems.map(mapShoppingListRowToItem));
        const storedFavorites = await getStoredFavorites(db);
        hydrateFavorites(storedFavorites.map(mapFavoriteRowToFavorite));
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
  }, [db, hydratePreferences, hydrateShoppingItems]);

  return {
    isBootstrapping,
    bootstrapError,
  };
}
