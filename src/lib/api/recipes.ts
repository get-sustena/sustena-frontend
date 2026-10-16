import {
  PaginatedResponse,
  RecipeCookedResponse,
  RecipeDetail,
  RecipeListItem,
  RecipeSearchParams,
} from "../../types/api";
import type { RecipeCatalogue } from "../../db/recipeRows";
import type { CatalogueDownload } from "../catalogue/recipeCatalogueSync";
import type { RecipeSource } from "../recipeSource";
import { apiConditionalGet, apiRequest } from "./client";
import { isApiClientError } from "./errors";

export function getRecipes(params?: RecipeSearchParams) {
  return apiRequest<PaginatedResponse<RecipeListItem>>({
    url: "/recipes",
    method: "GET",
    params,
  });
}

// "I cooked it". The backend counts once per person, recipe and Lagos day
// of `cookedAt` (the time of the tap, ISO with an offset; today without it);
// `counted` is false when that day's cook was already counted.
export function markRecipeCooked(recipeId: string, source?: RecipeSource, cookedAt?: string) {
  return apiRequest<RecipeCookedResponse>({
    url: `/recipes/${recipeId}/cooked`,
    method: "POST",
    data: { ...(source ? { source } : {}), ...(cookedAt ? { cookedAt } : {}) },
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

// Your stars for a recipe, 1 to 5; sending another number changes them.
export function rateRecipe(recipeId: string, rating: number) {
  return apiRequest<{ rating: number | null; averageRating: number | null; ratingCount: number }>({
    url: `/recipes/${encodeURIComponent(recipeId)}/rating`,
    method: "PUT",
    data: { rating },
  });
}

// What anyone may see of a shared recipe, signed in or not: its name and photo.
export function getPublicRecipeCard(slug: string) {
  return apiRequest<{ slug: string; name: string; imageUrl: string | null }>({
    url: `/public/recipes/${encodeURIComponent(slug)}`,
    method: "GET",
  });
}

export function getRecipeBySlug(slug: string) {
  return apiRequest<RecipeDetail>({
    url: `/recipes/slug/${encodeURIComponent(slug)}`,
    method: "GET",
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

// Every public recipe in full (GET /recipes/catalogue), for the phone to
// keep offline (OFF-01). With the version saved last time, an unchanged
// catalogue answers 304 and nothing is downloaded. An API from before this
// request existed answers 404: the saved catalogue stays as it is.
export async function getRecipeCatalogue(savedVersion: string | null): Promise<CatalogueDownload> {
  try {
    const response = await apiConditionalGet<RecipeCatalogue>(
      "/recipes/catalogue",
      savedVersion ? `"${savedVersion}"` : null
    );
    if (response.notModified) return { changed: false };
    return { changed: true, catalogue: response.data };
  } catch (error) {
    if (isApiClientError(error) && error.status === 404) return { changed: false };
    throw error;
  }
}
