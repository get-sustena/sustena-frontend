
import { useQueryClient } from "@tanstack/react-query";
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
import { mapShoppingListRowToItem } from "../db/shoppingItemRows";
import {
  getStoredShoppingListItems,
  replaceShoppingListItemsForList,
} from "../db/shoppingListRepository";
import {
  getStoredShoppingLists,
  mapShoppingListRowToMeta,
  upsertShoppingList,
} from "../db/shoppingListsRepository";
import { getSavedIngredientCatalog } from "../db/ingredientCatalogRepository";
import { startApi } from "../lib/api";
import { apiShoppingItemToLocalItem } from "../lib/api/adapters";
import { getMealTime } from "../lib/mealTime";
import { queryKeys } from "../lib/query/queryKeys";
import { applyBundledRecipeSeed } from "../db/recipeRepository";
import { keepRecipesOffline, showSavedPhotos } from "../lib/catalogue/offlineCatalogue";
import { saveMealPicks } from "../lib/catalogue/mealPicks";
import { withPendingSettings } from "../lib/settings/settingsCommands";
import { useFavoritesStore } from "../store/favoritesStore";
import { useAuthStore } from "../store/authStore";
import { usePreferencesStore } from "../store/preferencesStore";
import { usePlannerStore } from "../store/plannerStore";
import { usePantryStore } from "../store/pantryStore";
import { useProfileAnswersStore } from "../store/profileAnswersStore";
import { useShoppingListStore } from "../store/shoppingListStore";
import { useShoppingListsStore } from "../store/shoppingListsStore";
import { DEFAULT_SHOPPING_LIST_ID } from "../types/shoppingList";
import type { StartResponse } from "../types/api";
import type {
  DietaryPreference,
  HealthCondition,
} from "../types/preferences";

export function useAppBootstrap(enabled = true) {
  const db = useSQLiteContext();
  const queryClient = useQueryClient();
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

    // Everything the app loads from the server when it opens, in one
    // request (GET /me/start). Its parts fill the caches their own queries
    // read, before those queries are let through (see useStartLoading), so
    // nothing is asked for twice. Shopping lists have no query; they're
    // saved on the device as before.
    async function loadStart() {
      const mealTime = getMealTime(new Date());
      const reply = await startApi.getStart(mealTime);
      // Settings changed on the phone and not sent yet stay (QAD-01).
      const start: StartResponse = {
        ...reply,
        preferences: await withPendingSettings(db, "preferences_update", reply.preferences),
        profileAnswers: await withPendingSettings(db, "profile_answers_update", reply.profileAnswers),
        plannerSettings: await withPendingSettings(db, "planner_settings_update", reply.plannerSettings),
      };

      queryClient.setQueryData(queryKeys.preferences.me, start.preferences);
      queryClient.setQueryData(queryKeys.profileAnswers.me, start.profileAnswers);
      queryClient.setQueryData(queryKeys.planner.settings, start.plannerSettings);
      queryClient.setQueryData(queryKeys.pantry.me, start.pantry);
      queryClient.setQueryData(
        queryKeys.recommendations.homeForMeal(mealTime),
        start.recommendations
      );

      // A catalogue version different from the saved copy's means the
      // catalogue changed since it was saved.
      const savedCatalogue = await getSavedIngredientCatalog(db).catch(() => null);
      if (savedCatalogue?.etag?.replace(/"/g, "") !== start.ingredientCatalogueVersion) {
        void queryClient.invalidateQueries({ queryKey: queryKeys.ingredients.catalog });
      }

      return start;
    }

    async function saveStart(start: StartResponse, requestedAt: number) {
      if (start.mealPicks) {
        await saveMealPicks(db, start.user.id, start.mealPicks, new Date().toISOString());
      }
      const current = usePreferencesStore.getState();
      const mergedPreferences = {
        healthConditions: start.preferences.healthConditions as HealthCondition[],
        dietaryPreference: start.preferences.dietaryPreference as DietaryPreference,
        defaultUnitMode: start.preferences.defaultUnitMode,
        defaultServingSize: start.preferences.defaultServingSize,
        hapticsEnabled: current.hapticsEnabled,
        dataSaverEnabled: current.dataSaverEnabled,
        mealRemindersEnabled: current.mealRemindersEnabled,
        hasCompletedOnboarding: current.hasCompletedOnboarding,
      };
      hydratePreferences(mergedPreferences);
      await saveStoredPreferences(db, mergedPreferences);

      hydrateProfileAnswers(start.profileAnswers);
      await saveStoredProfileAnswers(db, start.profileAnswers);

      hydratePlanSetup(start.plannerSettings);
      await saveStoredPlannerSettings(db, start.plannerSettings);

      const pantryIngredientIds = start.pantry.items.map((item) => item.ingredientId);
      hydratePantry(pantryIngredientIds);
      await replaceStoredPantry(db, pantryIngredientIds);

      const listMetadata = start.shoppingLists.map((list) => ({
        id: list.id,
        name: list.name,
        isDefaultSyncedList: list.isActive,
        createdAt: list.createdAt,
        updatedAt: list.updatedAt,
      }));
      for (const [index, list] of start.shoppingLists.entries()) {
        await upsertShoppingList(db, listMetadata[index]);
        const saved = await replaceShoppingListItemsForList(
          db,
          list.id,
          list.items.map((item) => ({
            ...apiShoppingItemToLocalItem(item),
            listId: list.id,
          })),
          { requestedAt }
        );
        if (list.isActive) {
          hydrateShoppingItems(saved);
        }
      }
      hydrateShoppingLists(listMetadata);
    }

    async function bootstrap() {
      // Asked for first, so the server's answer is on its way while the
      // copy saved on the device loads. The app opens on the saved copy and
      // doesn't wait for the server.
      const startRequestedAt = Date.now();
      const start = currentUserId
        ? queryClient
            .fetchQuery({
              queryKey: queryKeys.start,
              queryFn: loadStart,
              staleTime: 0,
              retry: false,
            })
            .catch(() => null)
        : null;

      try {
        await applyBundledRecipeSeed(db);
        await showSavedPhotos(db);

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

        hydratePantry(await getStoredPantryIngredientIds(db));

        const storedShoppingLists = await getStoredShoppingLists(db);
        hydrateShoppingLists(storedShoppingLists.map(mapShoppingListRowToMeta));
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

      // Offline or on a server error, the saved copy stays, and each screen's
      // own query asks again.
      const started = await start;
      if (started && isMounted) {
        try {
          await saveStart(started, startRequestedAt);
        } catch {
        }
        await keepRecipesOffline(db, queryClient, started.recipeCatalogueVersion ?? null);
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
    queryClient,
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
