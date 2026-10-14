import type { SQLiteDatabase } from "expo-sqlite";
import type { PlannerSettings } from "../types/api.ts";

const SETTINGS_ID = "current_user_planner_settings";

type PlannerSettingsRow = {
  days: number;
  meal_slots_json: string;
  meals_per_day: number;
};

export async function getStoredPlannerSettings(db: SQLiteDatabase) {
  return db.getFirstAsync<PlannerSettingsRow>(
    `
    SELECT days, meal_slots_json, meals_per_day
    FROM local_planner_settings
    WHERE id = ?
    LIMIT 1
    `,
    [SETTINGS_ID]
  );
}

export async function saveStoredPlannerSettings(
  db: SQLiteDatabase,
  settings: PlannerSettings
) {
  await db.runAsync(
    `
    INSERT INTO local_planner_settings (
      id,
      days,
      meal_slots_json,
      meals_per_day,
      updated_at
    )
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      days = excluded.days,
      meal_slots_json = excluded.meal_slots_json,
      meals_per_day = excluded.meals_per_day,
      updated_at = excluded.updated_at
    `,
    [
      SETTINGS_ID,
      settings.days,
      JSON.stringify(settings.mealSlots),
      settings.mealSlots.length,
      new Date().toISOString(),
    ]
  );
}

export function mapStoredPlannerSettings(
  row: PlannerSettingsRow | null
): PlannerSettings | null {
  if (!row) {
    return null;
  }

  const mealSlots = JSON.parse(
    row.meal_slots_json
  ) as PlannerSettings["mealSlots"];

  return {
    days: row.days,
    mealSlots,
    mealsPerDay: mealSlots.length,
  };
}
