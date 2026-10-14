// The plan on the budget planner (MP-01): it stays, saved or not, until a
// new one is made, even after the app is closed. Each account keeps its own.
// Shared by the app and its tests, so nothing here imports React Native.
import type { SQLiteDatabase } from "expo-sqlite";
import { getLocalMetadata, setLocalMetadata } from "../../db/recipeRows.ts";
import type { MealSlot, RecipeListItem } from "../../types/api.ts";
import type { PlanDraft } from "./planCommands.ts";

export type DraftMeal = {
  // Its id in the saved plan, once the plan is saved.
  planItemId?: string;
  recipe: RecipeListItem;
  estimatedCost: number | null;
  mealSlot: MealSlot;
  day: number;
  servings: number;
};

export type PlannerDraft = {
  budget: string;
  meals: DraftMeal[];
  // What the plan was made with, for saving it.
  info: Omit<PlanDraft, "items"> | null;
  // The saved plan this one is, if it's saved.
  savedPlanId: string | null;
};

const key = (userId: string) => `planner_draft:${userId}`;

export async function getPlannerDraft(db: SQLiteDatabase, userId: string) {
  const saved = await getLocalMetadata(db, key(userId));
  if (!saved) return null;
  try {
    return JSON.parse(saved) as PlannerDraft;
  } catch {
    return null;
  }
}

export async function savePlannerDraft(db: SQLiteDatabase, userId: string, draft: PlannerDraft) {
  await setLocalMetadata(db, key(userId), JSON.stringify(draft), new Date().toISOString());
}
