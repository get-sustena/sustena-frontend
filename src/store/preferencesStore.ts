
import { create } from "zustand";
import { UnitMode } from "../data/recipes";
import { StoredPreferences } from "../db/preferencesRepository";
import {
  DietaryPreference,
  HealthCondition,
  UserPreferences,
} from "../types/preferences";

type PreferencesState = UserPreferences & {
  hasCompletedOnboarding: boolean;

  hydratePreferences: (preferences: StoredPreferences) => void;

  setHealthConditions: (conditions: HealthCondition[]) => void;
  toggleHealthCondition: (condition: HealthCondition) => void;

  setDietaryPreference: (preference: DietaryPreference) => void;

  setDefaultUnitMode: (unitMode: UnitMode) => void;
  setDefaultServingSize: (servingSize: number) => void;

  toggleHaptics: () => void;
  toggleDataSaver: () => void;
  toggleMealReminders: () => void;

  completeOnboarding: () => void;
  resetPreferences: () => void;
};

const DEFAULT_PREFERENCES: UserPreferences = {
  healthConditions: ["none"],
  dietaryPreference: "no_restrictions",
  defaultUnitMode: "metric",
  defaultServingSize: 1,
  hapticsEnabled: true,
  dataSaverEnabled: true,
  mealRemindersEnabled: false,
};

export const usePreferencesStore = create<PreferencesState>((set, get) => ({
  ...DEFAULT_PREFERENCES,
  hasCompletedOnboarding: false,

  hydratePreferences: (preferences) => {
    set({
      ...preferences,
    });
  },

  setHealthConditions: (conditions) => {
    set({
      healthConditions: normalizeHealthConditions(conditions),
    });
  },

  toggleHealthCondition: (condition) => {
    const current = get().healthConditions;

    if (condition === "none") {
      set({
        healthConditions: ["none"],
      });
      return;
    }

    const withoutNone = current.filter((item) => item !== "none");

    if (withoutNone.includes(condition)) {
      const next = withoutNone.filter((item) => item !== condition);

      set({
        healthConditions: next.length === 0 ? ["none"] : next,
      });

      return;
    }

    set({
      healthConditions: [...withoutNone, condition],
    });
  },

  setDietaryPreference: (preference) => {
    set({
      dietaryPreference: preference,
    });
  },

  setDefaultUnitMode: (unitMode) => {
    set({
      defaultUnitMode: unitMode,
    });
  },

  setDefaultServingSize: (servingSize) => {
    set({
      defaultServingSize: Math.max(1, Math.min(25, servingSize)),
    });
  },

  toggleHaptics: () => {
    set((state) => ({
      hapticsEnabled: !state.hapticsEnabled,
    }));
  },

  toggleDataSaver: () => {
    set((state) => ({
      dataSaverEnabled: !state.dataSaverEnabled,
    }));
  },

  toggleMealReminders: () => {
    set((state) => ({
      mealRemindersEnabled: !state.mealRemindersEnabled,
    }));
  },

  completeOnboarding: () => {
    set({
      hasCompletedOnboarding: true,
    });
  },

  resetPreferences: () => {
    set({
      ...DEFAULT_PREFERENCES,
      hasCompletedOnboarding: false,
    });
  },
}));

function normalizeHealthConditions(conditions: HealthCondition[]) {
  if (conditions.length === 0) {
    return ["none"] satisfies HealthCondition[];
  }

  if (conditions.includes("none") && conditions.length > 1) {
    return conditions.filter((condition) => condition !== "none");
  }

  return conditions;
}
