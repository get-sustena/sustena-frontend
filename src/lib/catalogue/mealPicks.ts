// Home's pick with no connection (OFF-01): /me/start sends the recommended
// recipe for each meal of the next 14 days, and the phone keeps them.
// Shared by the app and its tests, so nothing here imports React Native.
import type { SQLiteDatabase } from "expo-sqlite";
import { getLocalMetadata, setLocalMetadata } from "../../db/recipeRows.ts";
import type { MealPicksForDay } from "../../types/api.ts";
import type { MealTime } from "../mealTime.ts";

// Lagos is on West Africa Time all year: UTC+1, no daylight saving.
export function lagosDate(at: Date) {
  return new Date(at.getTime() + 60 * 60_000).toISOString().slice(0, 10);
}

// Puts today's pick for the meal first, when it's on the phone.
export function withTodaysPickFirst<T extends { id: string }>(
  recipes: T[],
  picks: MealPicksForDay[] | null,
  mealTime: MealTime,
  at: Date
) {
  const today = picks?.find((day) => day.date === lagosDate(at));
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
