import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSQLiteContext } from "expo-sqlite";
import { useEffect } from "react";
import { saveStoredPlannerSettings } from "../../db/plannerSettingsRepository";
import { enqueueSyncOperation } from "../../db/syncQueueRepository";
import { plannerApi } from "../../lib/api";
import { toApiClientError } from "../../lib/api/errors";
import { queryKeys } from "../../lib/query/queryKeys";
import { useAuthStore } from "../../store/authStore";
import { usePlannerStore } from "../../store/plannerStore";
import type { PlannerSettingsUpdateRequest } from "../../types/api";

export function useBudgetPlannerMutation() {
  return useMutation({
    mutationFn: plannerApi.getBudgetPlan,
  });
}

export function usePlannerSettingsQuery() {
  const db = useSQLiteContext();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const hydratePlanSetup = usePlannerStore((state) => state.hydratePlanSetup);
  const query = useQuery({
    queryKey: queryKeys.planner.settings,
    queryFn: plannerApi.getPlannerSettings,
    enabled: isAuthenticated,
  });

  useEffect(() => {
    if (!query.data) {
      return;
    }

    hydratePlanSetup(query.data);
    saveStoredPlannerSettings(db, query.data).catch((error) => {
      console.error("Failed to cache planner settings", error);
    });
  }, [db, hydratePlanSetup, query.data]);

  return query;
}

export function useUpdatePlannerSettingsMutation() {
  const db = useSQLiteContext();
  const queryClient = useQueryClient();
  const setPlanSetup = usePlannerStore((state) => state.setPlanSetup);

  return useMutation({
    mutationFn: plannerApi.updatePlannerSettings,
    onMutate: async (payload: PlannerSettingsUpdateRequest) => {
      const settings = {
        ...payload,
        mealsPerDay: payload.mealSlots.length,
      };

      setPlanSetup(settings);
      await saveStoredPlannerSettings(db, settings).catch((error) => {
        console.error("Failed to cache planner settings locally", error);
      });
    },
    onSuccess: async (settings) => {
      setPlanSetup(settings);
      queryClient.setQueryData(queryKeys.planner.settings, settings);
      await saveStoredPlannerSettings(db, settings).catch((error) => {
        console.error("Failed to cache planner settings locally", error);
      });
    },
    onError: async (error, payload) => {
      if (toApiClientError(error).status !== 0) {
        return;
      }

      await enqueueSyncOperation(db, "planner_settings_update", {
        ...payload,
        mealsPerDay: payload.mealSlots.length,
      });
    },
  });
}

export function useKitchenPlannerMutation() {
  return useMutation({
    mutationFn: plannerApi.getKitchenMatches,
  });
}

export function useTimetablePlannerMutation() {
  return useMutation({
    mutationFn: plannerApi.getMealPlan,
  });
}

export const useMealPlanMutation = useTimetablePlannerMutation;
