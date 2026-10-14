import { useMutation, useQuery } from "@tanstack/react-query";
import { useSQLiteContext } from "expo-sqlite";
import { useEffect } from "react";
import { saveStoredPlannerSettings } from "../../db/plannerSettingsRepository";
import { plannerApi } from "../../lib/api";
import { queryKeys } from "../../lib/query/queryKeys";
import { withPendingSettings } from "../../lib/settings/settingsCommands";
import { useAuthStore } from "../../store/authStore";
import { usePlannerStore } from "../../store/plannerStore";
import { useStartLoading } from "./useStartLoading";

export function useBudgetPlannerMutation() {
  return useMutation({
    mutationFn: plannerApi.getBudgetPlan,
  });
}

export function usePlannerSettingsQuery() {
  const db = useSQLiteContext();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const hydratePlanSetup = usePlannerStore((state) => state.hydratePlanSetup);
  const startLoading = useStartLoading();
  const query = useQuery({
    queryKey: queryKeys.planner.settings,
    // A change not sent yet stays on top of the server's copy (QAD-01).
    queryFn: async () =>
      withPendingSettings(db, "planner_settings_update", await plannerApi.getPlannerSettings()),
    enabled: isAuthenticated && !startLoading,
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

export function useKitchenPlannerMutation() {
  return useMutation({
    mutationFn: plannerApi.getKitchenMatches,
  });
}
