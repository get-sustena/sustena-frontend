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

export function getRecipeById(recipeId: string) {
  return apiRequest<RecipeDetail>({
    url: `/recipes/${recipeId}`,
    method: "GET",
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
