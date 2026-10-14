
import { useQuery } from "@tanstack/react-query";
import { useSQLiteContext } from "expo-sqlite";
import { deleteFavoriteRecipe } from "../db/favoritesRepository";
import { getLocalRecipes } from "../db/recipeRows";
import { enqueueSyncOperation } from "../db/syncQueueRepository";
import {
  useFavoritesQuery,
  useRemoveFavoriteMutation,
} from "./api/useFavorites";
import { Recipe } from "../data/recipes";
import { apiFavoriteToRecipe } from "../lib/api/adapters";
import { queryKeys } from "../lib/query/queryKeys";
import { useFavoritesStore } from "../store/favoritesStore";

function apiFavoriteToRecipeLike(
  recipe: Parameters<typeof apiFavoriteToRecipe>[0]["recipe"]
) {
  return recipe
    ? apiFavoriteToRecipe({
        id: "",
        recipeId: recipe.id,
        createdAt: "",
        updatedAt: "",
        recipe,
      })
    : null;
}

export function useFavoriteRecipes() {
  const db = useSQLiteContext();

  const favorites = useFavoritesStore((state) => state.favorites);
  const removeFavorite = useFavoritesStore((state) => state.removeFavorite);
  const favoritesQuery = useFavoritesQuery();
  const removeFavoriteMutation = useRemoveFavoriteMutation();

  const localRecipesQuery = useQuery({
    queryKey: queryKeys.recipes.localFavorites,
    queryFn: () => getLocalRecipes(db, { page: 1, pageSize: 500 }),
    networkMode: "always",
  });
  const localRecipes =
    localRecipesQuery.data?.items
      .map(apiFavoriteToRecipeLike)
      .filter(Boolean) ?? [];

  const localFavoriteRecipes = favorites
    .map((favorite) =>
      localRecipes.find((recipe) => recipe?.id === favorite.recipeId)
    )
    .filter((recipe): recipe is Recipe => Boolean(recipe));
  const apiFavoriteRecipes =
    favoritesQuery.data
      ?.map(apiFavoriteToRecipe)
      .filter((recipe): recipe is Recipe => Boolean(recipe)) ?? [];
  const favoriteRecipes = favoritesQuery.data
    ? apiFavoriteRecipes
    : localFavoriteRecipes;

  async function removeFavoriteRecipe(recipeId: string) {
    removeFavorite(recipeId);
    await deleteFavoriteRecipe(db, recipeId).catch((error) => {
      console.error("Failed to remove favorite locally", error);
    });

    try {
      await removeFavoriteMutation.mutateAsync(recipeId);
    } catch (error) {
      console.error("Failed to sync favorite removal, queuing for retry", error);
      await enqueueSyncOperation(db, "favorite_remove", { recipeId }).catch(
        (queueError) => {
          console.error("Failed to queue favorite sync", queueError);
        }
      );
    }
  }

  return { favoriteRecipes, removeFavoriteRecipe };
}
