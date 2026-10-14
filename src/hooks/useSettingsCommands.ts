import { useSQLiteContext } from "expo-sqlite";
import { useMemo } from "react";
import { saveStoredProfileAnswers } from "../db/localProfileAnswersRepository";
import { saveStoredPlannerSettings } from "../db/plannerSettingsRepository";
import { saveStoredPreferences } from "../db/preferencesRepository";
import { runWriteTransaction } from "../db/writeTransaction";
import { createLocalId } from "../lib/id";
import { createSettingsCommands } from "../lib/settings/settingsCommands";
import { requestSync } from "../lib/sync/syncEvents";
import { usePlannerStore } from "../store/plannerStore";
import { usePreferencesStore } from "../store/preferencesStore";
import { useProfileAnswersStore } from "../store/profileAnswersStore";
import type { PlannerSettingsUpdateRequest, UserPreferencesUpdate } from "../types/api";
import type { DietaryPreference, HealthCondition } from "../types/preferences";
import { DEFAULT_PROFILE_ANSWERS, type ProfileAnswers } from "../types/profileAnswers";

// Preferences, profile answers and planner settings: changed on the phone at
// once and sent through the outbox, online or not (QAD-01, QAD-04).
export function useSettingsCommands() {
  const db = useSQLiteContext();
  return useMemo(() => {
    const commands = createSettingsCommands({
      db,
      transact: (work) => runWriteTransaction(db, work),
      newId: createLocalId,
      requestSync,
    });

    return {
      async savePreferences(update: UserPreferencesUpdate) {
        const store = usePreferencesStore.getState();
        store.setHealthConditions(update.healthConditions as HealthCondition[]);
        store.setDietaryPreference(update.dietaryPreference as DietaryPreference);
        store.setDefaultUnitMode(update.defaultUnitMode);
        store.setDefaultServingSize(update.defaultServingSize);
        const saved = usePreferencesStore.getState();
        await commands.save("preferences_update", update, (tx) =>
          saveStoredPreferences(tx, {
            healthConditions: saved.healthConditions,
            dietaryPreference: saved.dietaryPreference,
            defaultUnitMode: saved.defaultUnitMode,
            defaultServingSize: saved.defaultServingSize,
            hapticsEnabled: saved.hapticsEnabled,
            dataSaverEnabled: saved.dataSaverEnabled,
            mealRemindersEnabled: saved.mealRemindersEnabled,
            hasCompletedOnboarding: saved.hasCompletedOnboarding,
          })
        );
      },

      async saveProfileAnswers(change: Partial<ProfileAnswers>) {
        useProfileAnswersStore.getState().setProfileAnswers(change);
        const state = useProfileAnswersStore.getState();
        const answers = Object.fromEntries(
          Object.keys(DEFAULT_PROFILE_ANSWERS).map((key) => [key, state[key as keyof ProfileAnswers]])
        ) as ProfileAnswers;
        await commands.save("profile_answers_update", change, (tx) => saveStoredProfileAnswers(tx, answers));
      },

      async savePlannerSettings(settings: PlannerSettingsUpdateRequest) {
        const saved = { ...settings, mealsPerDay: settings.mealSlots.length };
        usePlannerStore.getState().setPlanSetup(saved);
        await commands.save("planner_settings_update", saved, (tx) => saveStoredPlannerSettings(tx, saved));
      },
    };
  }, [db]);
}
