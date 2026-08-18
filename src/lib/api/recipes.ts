import {
  PaginatedResponse,
  RecipeDetail,
  RecipeListItem,
  RecipeRatingResponse,
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

export function getRecipeBySlug(slug: string) {
  return apiRequest<RecipeDetail>({
    url: `/recipes/slug/${slug}`,
    method: "GET",
  }).then(normalizeRecipeDetail);
}

export function getRecipeTags() {
  return apiRequest<string[]>({
    url: "/recipes/tags",
    method: "GET",
  });
}

export function rateRecipe(recipeId: string, rating: number) {
  return apiRequest<RecipeRatingResponse>({
    url: `/recipes/${recipeId}/rating`,
    method: "PUT",
    data: { rating },
  });
}

export function removeRecipeRating(recipeId: string) {
  return apiRequest<RecipeRatingResponse>({
    url: `/recipes/${recipeId}/rating`,
    method: "DELETE",
  });
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
