import type { RecipeListItem } from "../types/api";

export type MealTime = "breakfast" | "lunch" | "dinner";

// The founder's hours. Midnight to 6:00 is not decided yet and stays dinner.
export function getMealTime(date: Date): MealTime {
  const hour = date.getHours();

  if (hour >= 6 && hour < 11) return "breakfast";
  if (hour >= 11 && hour < 16) return "lunch";
  return "dinner";
}

export const MEAL_LABELS: Record<MealTime, string> = {
  breakfast: "Breakfast",
  lunch: "Lunch",
  dinner: "Dinner",
};

const MEALS_IN_DAY_ORDER: MealTime[] = ["breakfast", "lunch", "dinner"];

// The meals a recipe is tagged for, in the order of the day rather than the
// tags' alphabetical order, so "lunch" comes before "dinner".
export function getRecipeMeals(tags: string[]): MealTime[] {
  const labels = new Set(tags.map(normalizeLabel));
  return MEALS_IN_DAY_ORDER.filter((meal) => labels.has(meal));
}

// The chip on Home's recipe cards (founder, 13 October 2026): the current meal,
// so a lunch pick reads "Lunch" beside "Cook This for Lunch". A recipe that
// isn't tagged for this meal keeps its first tag rather than claim the meal.
export function getCardChipLabel(tags: string[], mealTime: MealTime): string | undefined {
  return getRecipeMeals(tags).includes(mealTime) ? MEAL_LABELS[mealTime] : tags[0];
}

const DRINK_LABELS = ["drink", "fruit-juice", "smoothie", "local-drink"];
const SUPPORTING_DISH_LABELS = ["side-dish", "complement", "sauce", "salad", "soup"];
const SNACK_LABELS = ["snack", "snacks-small-chops", "dessert"];

// Whether a recipe can be the meal on its own, so the offline fallback picks
// the same recipes as GET /me/recommendations?mealTime=... Follows
// cookease-backend app/services/meal_eligibility_service.py, except that the
// recipe must carry the meal's own tag: that is the rule the backend agreed
// for recommendations, and it reproduces the live catalogue's counts
// (21 breakfast, 45 lunch, 50 dinner of 114 on 13 October 2026).
export function isRecipeForMealTime(
  recipe: Pick<RecipeListItem, "tags" | "categories">,
  mealTime: MealTime
) {
  const tags = new Set(recipe.tags.map(normalizeLabel));
  const categories = new Set(recipe.categories.map(normalizeLabel));
  const labels = new Set([...tags, ...categories]);
  const hasAny = (candidates: string[]) =>
    candidates.some((label) => labels.has(label));
  const isMainMeal = labels.has("main-meal");
  const isLunchOrDinner = mealTime === "lunch" || mealTime === "dinner";

  if (hasAny(DRINK_LABELS)) return false;
  if (labels.has("swallow")) return mealTime === "dinner";

  if (!tags.has(mealTime)) return false;

  if (isLunchOrDinner && !isMainMeal) return false;
  if (hasAny(SUPPORTING_DISH_LABELS) && !isMainMeal) return false;
  if (isLunchOrDinner && hasAny(SNACK_LABELS) && !isMainMeal) return false;

  return true;
}

function normalizeLabel(value: string) {
  return value.trim().toLowerCase().replace(/_/g, "-").replace(/ /g, "-");
}
