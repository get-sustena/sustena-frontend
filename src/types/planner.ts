import type { BudgetMealSlot, PlannerSettings } from "./api";

export type PlanMealSlot = BudgetMealSlot;
export type PlanSetupValue = PlannerSettings;

export const DEFAULT_PLAN_SETUP: PlanSetupValue = {
  days: 1,
  mealsPerDay: 3,
  mealSlots: ["breakfast", "lunch", "dinner"],
};
