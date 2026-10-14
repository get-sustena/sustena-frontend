import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect } from "react";
import { preferencesApi } from "../../lib/api";
import { queryKeys } from "../../lib/query/queryKeys";
import { usePreferencesStore } from "../../store/preferencesStore";
import { UserPreferences } from "../../types/api";
import { useStartLoading } from "./useStartLoading";
import {
  DietaryPreference,
  HealthCondition,
} from "../../types/preferences";

export function usePreferencesQuery() {
  const hydrateLocalPreferences = useHydrateLocalPreferences();

  const startLoading = useStartLoading();
  const query = useQuery({
    queryKey: queryKeys.preferences.me,
    queryFn: preferencesApi.getPreferences,
    enabled: !startLoading,
  });

  useEffect(() => {
    if (query.data) {
      hydrateLocalPreferences(query.data);
    }
  }, [hydrateLocalPreferences, query.data]);

  return query;
}

export function useUpdatePreferencesMutation() {
  const queryClient = useQueryClient();
  const hydrateLocalPreferences = useHydrateLocalPreferences();

  return useMutation({
    mutationFn: preferencesApi.updatePreferences,
    onSuccess: (preferences) => {
      queryClient.setQueryData(queryKeys.preferences.me, preferences);
      queryClient.invalidateQueries({ queryKey: queryKeys.recommendations.home });
      hydrateLocalPreferences(preferences);
    },
  });
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
