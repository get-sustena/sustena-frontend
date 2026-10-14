
import { create } from "zustand";
import type { UnitMode } from "../data/recipes.ts";
import type { StoredPreferences } from "../db/preferencesRepository.ts";
import { clampServings } from "../lib/servings.ts";
import type {
  DietaryPreference,
  HealthCondition,
  UserPreferences,
} from "../types/preferences.ts";

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
  // Set, not toggled: turning reminders on can fail (permission, network).
  setMealRemindersEnabled: (enabled: boolean) => void;

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
      defaultServingSize: clampServings(servingSize),
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

  setMealRemindersEnabled: (enabled) => {
    set({ mealRemindersEnabled: enabled });
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
