import {
  PaginatedResponse,
  RecipeDetail,
  RecipeListItem,
  RecipeSearchParams,
} from "../../types/api";
import { apiRequest } from "./client";

export function getRecipes(params?: RecipeSearchParams) {
  return apiRequest<PaginatedResponse<RecipeListItem>>({
    url: "/recipes",
    method: "GET",
    params,
  });
}

// `source` says where in the app the recipe was opened from (for example
// "meal_reminder"); the backend records it on its recipe_opened event.
export function getRecipeById(recipeId: string, source?: string) {
  return apiRequest<RecipeDetail>({
    url: `/recipes/${recipeId}`,
    method: "GET",
    params: source ? { source } : undefined,
  }).then(normalizeRecipeDetail);
}

function normalizeRecipeDetail(recipe: RecipeDetail): RecipeDetail {
  return {
    ...recipe,
    instructions: recipe.instructions.map((instruction) => ({
      ...instruction,
      segments: Array.isArray(instruction.segments)
        ? instruction.segments
        : [],
    })),
  };
}
