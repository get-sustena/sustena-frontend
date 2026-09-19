// src/hooks/usePersistPreferences.ts

import { useSQLiteContext } from "expo-sqlite";
import { useEffect } from "react";
import { saveStoredPreferences } from "../db/preferencesRepository";
import { trackAccountBackgroundTask } from "../lib/accountBackgroundTasks";
import { usePreferencesStore } from "../store/preferencesStore";

export function usePersistPreferences(enabled = true) {
  const db = useSQLiteContext();

  const healthConditions = usePreferencesStore(
    (state) => state.healthConditions
  );
  const dietaryPreference = usePreferencesStore(
    (state) => state.dietaryPreference
  );
  const defaultUnitMode = usePreferencesStore((state) => state.defaultUnitMode);
  const defaultServingSize = usePreferencesStore(
    (state) => state.defaultServingSize
  );
  const hapticsEnabled = usePreferencesStore((state) => state.hapticsEnabled);
  const dataSaverEnabled = usePreferencesStore(
    (state) => state.dataSaverEnabled
  );
  const mealRemindersEnabled = usePreferencesStore(
    (state) => state.mealRemindersEnabled
  );
  const hasCompletedOnboarding = usePreferencesStore(
    (state) => state.hasCompletedOnboarding
  );

  useEffect(() => {
    if (!enabled) {
      return;
    }

    trackAccountBackgroundTask(saveStoredPreferences(db, {
      healthConditions,
      dietaryPreference,
      defaultUnitMode,
      defaultServingSize,
      hapticsEnabled,
      dataSaverEnabled,
      mealRemindersEnabled,
      hasCompletedOnboarding,
    })).catch((error) => {
      console.error("Failed to persist preferences", error);
    });
  }, [
    db,
    enabled,
    healthConditions,
    dietaryPreference,
    defaultUnitMode,
    defaultServingSize,
    hapticsEnabled,
    dataSaverEnabled,
    mealRemindersEnabled,
    hasCompletedOnboarding,
  ]);
}
