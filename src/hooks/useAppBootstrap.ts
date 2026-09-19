// src/hooks/useAppBootstrap.ts

import { useSQLiteContext } from "expo-sqlite";
import { useEffect, useState } from "react";
import { trackAccountBackgroundTask } from "../lib/accountBackgroundTasks";
import {
  getStoredFavorites,
  mapFavoriteRowToFavorite,
} from "../db/favoritesRepository";
import {
  getStoredProfileAnswers,
  mapStoredProfileAnswersRow,
  saveStoredProfileAnswers,
} from "../db/localProfileAnswersRepository";
import {
  getStoredPreferences,
  mapStoredPreferencesRow,
  saveStoredPreferences,
} from "../db/preferencesRepository";
import {
  getStoredPlannerSettings,
  mapStoredPlannerSettings,
  saveStoredPlannerSettings,
} from "../db/plannerSettingsRepository";
import {
  getStoredPantryIngredientIds,
  replaceStoredPantry,
} from "../db/pantryRepository";
import {
  getStoredShoppingListItems,
  mapShoppingListRowToItem,
  replaceShoppingListItemsForList,
} from "../db/shoppingListRepository";
import {
  getStoredShoppingLists,
  mapShoppingListRowToMeta,
  upsertShoppingList,
} from "../db/shoppingListsRepository";
import {
  pantryApi,
  plannerApi,
  preferencesApi,
  profileAnswersApi,
  shoppingListsApi,
} from "../lib/api";
import { apiShoppingItemToLocalItem } from "../lib/api/adapters";
import { seedPublishedRecipesIfNeeded } from "../db/recipeRepository";
import { useFavoritesStore } from "../store/favoritesStore";
import { useAuthStore } from "../store/authStore";
import { usePreferencesStore } from "../store/preferencesStore";
import { usePlannerStore } from "../store/plannerStore";
import { usePantryStore } from "../store/pantryStore";
import { useProfileAnswersStore } from "../store/profileAnswersStore";
import { useShoppingListStore } from "../store/shoppingListStore";
import { useShoppingListsStore } from "../store/shoppingListsStore";
import { DEFAULT_SHOPPING_LIST_ID } from "../types/shoppingList";
import type {
  DietaryPreference,
  HealthCondition,
} from "../types/preferences";

export function useAppBootstrap(enabled = true) {
  const db = useSQLiteContext();
  const currentUserId = useAuthStore((state) => state.user?.id);

  const [bootstrapState, setBootstrapState] = useState<{
    userId: string | null;
    status: "loading" | "ready" | "error";
    error: string | null;
  }>({ userId: null, status: "loading", error: null });

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
  const hydratePantry = usePantryStore((state) => state.hydratePantry);
  const hydrateShoppingLists = useShoppingListsStore(
    (state) => state.hydrateLists
  );

  useEffect(() => {
    if (!enabled) {
      return;
    }

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

        if (currentUserId) {
          const [preferencesResult, profileResult, plannerResult] =
            await Promise.allSettled([
              preferencesApi.getPreferences(),
              profileAnswersApi.getProfileAnswers(),
              plannerApi.getPlannerSettings(),
            ]);

          if (preferencesResult.status === "fulfilled") {
            const current = usePreferencesStore.getState();
            const server = preferencesResult.value;
            const mergedPreferences = {
              healthConditions: server.healthConditions as HealthCondition[],
              dietaryPreference:
                server.dietaryPreference as DietaryPreference,
              defaultUnitMode: server.defaultUnitMode,
              defaultServingSize: server.defaultServingSize,
              hapticsEnabled: current.hapticsEnabled,
              dataSaverEnabled: current.dataSaverEnabled,
              mealRemindersEnabled: current.mealRemindersEnabled,
              hasCompletedOnboarding: current.hasCompletedOnboarding,
            };
            hydratePreferences(mergedPreferences);
            await saveStoredPreferences(db, mergedPreferences);
          }

          if (profileResult.status === "fulfilled") {
            hydrateProfileAnswers(profileResult.value);
            await saveStoredProfileAnswers(db, profileResult.value);
          }

          if (plannerResult.status === "fulfilled") {
            hydratePlanSetup(plannerResult.value);
            await saveStoredPlannerSettings(db, plannerResult.value);
          }
        }

        hydratePantry(await getStoredPantryIngredientIds(db));

        const storedShoppingLists = await getStoredShoppingLists(db);
        hydrateShoppingLists(storedShoppingLists.map(mapShoppingListRowToMeta));

        if (currentUserId) {
          try {
            const serverPantry = await pantryApi.getPantry();
            const pantryIngredientIds = serverPantry.items.map(
              (item) => item.ingredientId
            );
            hydratePantry(pantryIngredientIds);
            await replaceStoredPantry(db, pantryIngredientIds);
          } catch {
            // Cached pantry remains available while offline.
          }

          try {
            const serverLists = await shoppingListsApi.getShoppingLists();
            const listMetadata = serverLists.map((list) => ({
              id: list.id,
              name: list.name,
              isDefaultSyncedList: list.isActive,
              createdAt: list.createdAt,
              updatedAt: list.updatedAt,
            }));
            for (const list of serverLists) {
              const metadata = listMetadata.find((entry) => entry.id === list.id)!;
              await upsertShoppingList(db, metadata);
              await replaceShoppingListItemsForList(
                db,
                list.id,
                list.items.map((item) => ({
                  ...apiShoppingItemToLocalItem(item),
                  listId: list.id,
                }))
              );
            }
            hydrateShoppingLists(listMetadata);
            const active = serverLists.find((list) => list.isActive);
            if (active) {
              hydrateShoppingItems(
                active.items.map((item) => ({
                  ...apiShoppingItemToLocalItem(item),
                  listId: active.id,
                }))
              );
            }
          } catch {
            // Cached lists remain available while offline.
          }
        }
      } catch (error) {
        console.error(error);

        if (isMounted) {
          setBootstrapState({
            userId: currentUserId ?? null,
            status: "error",
            error: "Could not load local app data.",
          });
        }
      } finally {
        if (isMounted) {
          setBootstrapState((current) =>
            current.userId === (currentUserId ?? null) && current.status === "error"
              ? current
              : { userId: currentUserId ?? null, status: "ready", error: null }
          );
        }
      }
    }

    void trackAccountBackgroundTask(bootstrap());

    return () => {
      isMounted = false;
    };
  }, [
    db,
    enabled,
    currentUserId,
    hydrateFavorites,
    hydratePantry,
    hydratePreferences,
    hydratePlanSetup,
    hydrateProfileAnswers,
    hydrateShoppingItems,
    hydrateShoppingLists,
  ]);

  return {
    isBootstrapping:
      enabled &&
      (bootstrapState.userId !== (currentUserId ?? null) ||
        bootstrapState.status === "loading"),
    bootstrapError:
      enabled && bootstrapState.userId === (currentUserId ?? null)
        ? bootstrapState.error
        : null,
  };
}
