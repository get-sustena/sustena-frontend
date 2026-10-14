// Home's pick with no connection (OFF-01): /me/start sends the recommended
// recipe for each meal of the next 14 days, and the phone keeps them.
// Shared by the app and its tests, so nothing here imports React Native.
import type { SQLiteDatabase } from "expo-sqlite";
import { getLocalMetadata, setLocalMetadata } from "../../db/recipeRows.ts";
import type { MealPicksForDay } from "../../types/api.ts";
import { getLagosDay } from "../lagosDay.ts";
import type { MealTime } from "../mealTime.ts";

// Puts today's pick for the meal first, when it's on the phone.
export function withTodaysPickFirst<T extends { id: string }>(
  recipes: T[],
  picks: MealPicksForDay[] | null,
  mealTime: MealTime,
  at: Date
) {
  const today = picks?.find((day) => day.date === getLagosDay(at));
  const pickId = today?.[mealTime];
  const pick = pickId ? recipes.find((recipe) => recipe.id === pickId) : undefined;
  return pick ? [pick, ...recipes.filter((recipe) => recipe !== pick)] : recipes;
}

// Picks are the person's own, so each account keeps its own.
const key = (userId: string) => `meal_picks:${userId}`;

export async function saveMealPicks(db: SQLiteDatabase, userId: string, picks: MealPicksForDay[], now: string) {
  await setLocalMetadata(db, key(userId), JSON.stringify(picks), now);
}

export async function getSavedMealPicks(db: SQLiteDatabase, userId: string) {
  const saved = await getLocalMetadata(db, key(userId));
  if (!saved) return null;
  try {
    return JSON.parse(saved) as MealPicksForDay[];
  } catch {
    return null;
  }
}
