import { useQuery } from "@tanstack/react-query";
import { useSQLiteContext } from "expo-sqlite";
import { useCallback, useEffect } from "react";
import { preferencesApi } from "../../lib/api";
import { withPendingSettings } from "../../lib/settings/settingsCommands";
import { queryKeys } from "../../lib/query/queryKeys";
import { usePreferencesStore } from "../../store/preferencesStore";
import { UserPreferences } from "../../types/api";
import { useStartLoading } from "./useStartLoading";
import {
  DietaryPreference,
  HealthCondition,
} from "../../types/preferences";

export function usePreferencesQuery() {
  const db = useSQLiteContext();
  const hydrateLocalPreferences = useHydrateLocalPreferences();

  const startLoading = useStartLoading();
  const query = useQuery({
    queryKey: queryKeys.preferences.me,
    // A change not sent yet stays on top of the server's copy (QAD-01).
    queryFn: async () =>
      withPendingSettings(db, "preferences_update", await preferencesApi.getPreferences()),
    enabled: !startLoading,
  });

  useEffect(() => {
    if (query.data) {
      hydrateLocalPreferences(query.data);
    }
  }, [hydrateLocalPreferences, query.data]);

  return query;
}

function useHydrateLocalPreferences() {
  const setHealthConditions = usePreferencesStore(
    (state) => state.setHealthConditions
  );
  const setDietaryPreference = usePreferencesStore(
    (state) => state.setDietaryPreference
  );
  const setDefaultUnitMode = usePreferencesStore(
    (state) => state.setDefaultUnitMode
  );
  const setDefaultServingSize = usePreferencesStore(
    (state) => state.setDefaultServingSize
  );

  return useCallback((preferences: UserPreferences) => {
    setHealthConditions(preferences.healthConditions as HealthCondition[]);
    setDietaryPreference(preferences.dietaryPreference as DietaryPreference);
    setDefaultUnitMode(preferences.defaultUnitMode);
    setDefaultServingSize(preferences.defaultServingSize);
  }, [
    setDefaultServingSize,
    setDefaultUnitMode,
    setDietaryPreference,
    setHealthConditions,
  ]);
}
