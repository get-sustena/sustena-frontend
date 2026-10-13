import {
  MyRecipeListParams,
  PaginatedResponse,
  RecipeAuthoringVocabulary,
  RecipeDraft,
  RecipeDraftCreateRequest,
  RecipeDraftWriteRequest,
} from "../../types/api";
import { apiRequest } from "./client";

export function getAuthoringVocabulary() {
  return apiRequest<RecipeAuthoringVocabulary>({
    url: "/recipes/authoring-vocabulary",
    method: "GET",
  });
}

export function getMyRecipes(params?: MyRecipeListParams) {
  return apiRequest<PaginatedResponse<RecipeDraft>>({
    url: "/me/recipes",
    method: "GET",
    params,
  });
}

export function getMyRecipe(recipeId: string) {
  return apiRequest<RecipeDraft>({
    url: `/me/recipes/${encodeURIComponent(recipeId)}`,
    method: "GET",
  });
}

export function createRecipeDraft(payload: RecipeDraftCreateRequest) {
  return apiRequest<RecipeDraft>({
    url: "/me/recipes",
    method: "POST",
    data: payload,
  });
}

export function updateRecipeDraft(
  recipeId: string,
  payload: RecipeDraftWriteRequest
) {
  return apiRequest<RecipeDraft>({
    url: `/me/recipes/${encodeURIComponent(recipeId)}`,
    method: "PUT",
    data: payload,
  });
}

export function createRecipeEditDraft(recipeId: string) {
  return apiRequest<RecipeDraft>({
    url: `/me/recipes/${encodeURIComponent(recipeId)}/edit-draft`,
    method: "POST",
  });
}

export function duplicateRecipe(recipeId: string) {
  return apiRequest<RecipeDraft>({
    url: `/me/recipes/${encodeURIComponent(recipeId)}/duplicate`,
    method: "POST",
  });
}

export function publishRecipe(recipeId: string, revision: number) {
  return apiRequest<RecipeDraft>({
    url: `/me/recipes/${encodeURIComponent(recipeId)}/publish`,
    method: "POST",
    params: { revision },
  });
}

export function deleteRecipe(recipeId: string, revision: number) {
  return apiRequest<void>({
    url: `/me/recipes/${encodeURIComponent(recipeId)}`,
    method: "DELETE",
    params: { revision },
  });
}
