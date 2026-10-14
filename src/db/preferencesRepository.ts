
import type { SQLiteDatabase } from "expo-sqlite";
import type { HealthCondition, UserPreferences } from "../types/preferences.ts";

export type StoredPreferences = UserPreferences & {
  hasCompletedOnboarding: boolean;
};

const PREFERENCES_ID = "current_user_preferences";

export async function getStoredPreferences(db: SQLiteDatabase) {
  return db.getFirstAsync<{
    id: string;
    health_conditions_json: string;
    dietary_preference: StoredPreferences["dietaryPreference"];
    default_unit_mode: StoredPreferences["defaultUnitMode"];
    default_serving_size: number;
    haptics_enabled: number;
    data_saver_enabled: number;
    meal_reminders_enabled: number;
    has_completed_onboarding: number;
    created_at: string;
    updated_at: string;
  }>(
    `
    SELECT *
    FROM user_preferences
    WHERE id = ?
    LIMIT 1
    `,
    [PREFERENCES_ID]
  );
}

export async function saveStoredPreferences(
  db: SQLiteDatabase,
  preferences: StoredPreferences
) {
  const now = new Date().toISOString();

  await db.runAsync(
    `
    INSERT INTO user_preferences (
      id,
      health_conditions_json,
      dietary_preference,
      default_unit_mode,
      default_serving_size,
      haptics_enabled,
      data_saver_enabled,
      meal_reminders_enabled,
      has_completed_onboarding,
      created_at,
      updated_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      health_conditions_json = excluded.health_conditions_json,
      dietary_preference = excluded.dietary_preference,
      default_unit_mode = excluded.default_unit_mode,
      default_serving_size = excluded.default_serving_size,
      haptics_enabled = excluded.haptics_enabled,
      data_saver_enabled = excluded.data_saver_enabled,
      meal_reminders_enabled = excluded.meal_reminders_enabled,
      has_completed_onboarding = excluded.has_completed_onboarding,
      updated_at = excluded.updated_at
    `,
    [
      PREFERENCES_ID,
      JSON.stringify(preferences.healthConditions),
      preferences.dietaryPreference,
      preferences.defaultUnitMode,
      preferences.defaultServingSize,
      preferences.hapticsEnabled ? 1 : 0,
      preferences.dataSaverEnabled ? 1 : 0,
      preferences.mealRemindersEnabled ? 1 : 0,
      preferences.hasCompletedOnboarding ? 1 : 0,
      now,
      now,
    ]
  );
}

export function mapStoredPreferencesRow(
  row: Awaited<ReturnType<typeof getStoredPreferences>>
): StoredPreferences | null {
  if (!row) {
    return null;
  }

  return {
    healthConditions: JSON.parse(
      row.health_conditions_json
    ) as HealthCondition[],
    dietaryPreference: row.dietary_preference,
    defaultUnitMode: row.default_unit_mode,
    defaultServingSize: row.default_serving_size,
    hapticsEnabled: Boolean(row.haptics_enabled),
    dataSaverEnabled: Boolean(row.data_saver_enabled),
    mealRemindersEnabled: Boolean(row.meal_reminders_enabled),
    hasCompletedOnboarding: Boolean(row.has_completed_onboarding),
  };
}
