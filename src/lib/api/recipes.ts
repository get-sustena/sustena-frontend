import {
  PaginatedResponse,
  RecipeCookedResponse,
  RecipeDetail,
  RecipeListItem,
  RecipeSearchParams,
} from "../../types/api";
import type { RecipeSource } from "../recipeSource";
import { apiRequest } from "./client";

export function getRecipes(params?: RecipeSearchParams) {
  return apiRequest<PaginatedResponse<RecipeListItem>>({
    url: "/recipes",
    method: "GET",
    params,
  });
}

// "I cooked it". The backend counts once per person, recipe and Lagos day;
// `counted` is false when today's cook was already counted.
export function markRecipeCooked(recipeId: string, source?: RecipeSource) {
  return apiRequest<RecipeCookedResponse>({
    url: `/recipes/${recipeId}/cooked`,
    method: "POST",
    data: source ? { source } : undefined,
  });
}

// `source` says where in the app the recipe was opened from (for example
// "meal_reminder"); the backend records it on its recipe_opened event.
export function getRecipeById(recipeId: string, source?: RecipeSource) {
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
