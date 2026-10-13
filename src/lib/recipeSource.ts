// Shared by the app and its tests, so nothing here imports React Native.

// Where in the app a recipe was opened from. The backend accepts exactly
// these (RECIPE_SOURCES in cookease-backend app/models/user_event.py) on
// GET /recipes/{id} (recipe_opened) and POST /recipes/{id}/cooked.
export const RECIPE_SOURCES = [
  "home",
  "search",
  "matching_recipes",
  "meal_plan",
  "saved",
  "creator_profile",
  "shopping_list",
  "meal_reminder",
] as const;

export type RecipeSource = (typeof RECIPE_SOURCES)[number];

// A route param is any string, so only a known source is passed on.
export function readRecipeSource(value: unknown): RecipeSource | undefined {
  return RECIPE_SOURCES.find((source) => source === value);
}
