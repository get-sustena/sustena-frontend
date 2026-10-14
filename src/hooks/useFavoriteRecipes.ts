import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useSQLiteContext } from "expo-sqlite";
import { useEffect } from "react";
import { getLocalRecipes } from "../db/recipeRows";
import { useFavoritesQuery } from "./api/useFavorites";
import { useFavoriteCommands } from "./useFavoriteCommands";
import { Recipe } from "../data/recipes";
import { apiFavoriteToRecipe } from "../lib/api/adapters";
import { savedRecipeList } from "../lib/favorites/favoriteCommands";
import { queryKeys } from "../lib/query/queryKeys";
import { onSyncFinished } from "../lib/sync/syncEvents";
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

const isRecipe = (recipe: Recipe | null): recipe is Recipe => Boolean(recipe);

// The Saved list (F05): the recipes saved on the phone, shown with the
// server's details when it has them, otherwise the phone's copy. A recipe
// unsaved on the phone leaves the list at once.
export function useFavoriteRecipes() {
  const db = useSQLiteContext();
  const queryClient = useQueryClient();
  const favorites = useFavoritesStore((state) => state.favorites);
  const favoritesQuery = useFavoritesQuery();
  const favoriteCommands = useFavoriteCommands();

  const localRecipesQuery = useQuery({
    queryKey: queryKeys.recipes.localFavorites,
    queryFn: () => getLocalRecipes(db, { page: 1, pageSize: 500 }),
    networkMode: "always",
  });
  const localRecipes = localRecipesQuery.data?.items.map(apiFavoriteToRecipeLike).filter(isRecipe) ?? [];
  const serverRecipes = favoritesQuery.data?.map(apiFavoriteToRecipe).filter(isRecipe);
  const favoriteRecipes = savedRecipeList(favorites, serverRecipes, localRecipes);

  // Once saves and unsaves reach the server, its list is asked for again.
  useEffect(
    () =>
      onSyncFinished(() => {
        void queryClient.invalidateQueries({ queryKey: queryKeys.favorites.all });
      }),
    [queryClient]
  );

  async function removeFavoriteRecipe(recipeId: string) {
    await favoriteCommands.setFavorite(recipeId, false);
  }

  return { favoriteRecipes, removeFavoriteRecipe };
}
