import { FavoriteMutationResponse, FavoriteRecipe } from "../../types/api";
import { apiRequest } from "./client";

export function getFavorites() {
  return apiRequest<FavoriteRecipe[]>({
    url: "/me/favorites",
    method: "GET",
  });
}

export function addFavorite(recipeId: string) {
  return apiRequest<FavoriteMutationResponse>({
    url: `/me/favorites/${recipeId}`,
    method: "POST",
  });
}

export function removeFavorite(recipeId: string) {
  return apiRequest<FavoriteMutationResponse>({
    url: `/me/favorites/${recipeId}`,
    method: "DELETE",
  });
}
