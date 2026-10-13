import { router } from "expo-router";
import type { RecipeSource } from "../recipeSource";

// Opens a recipe and says where from, so the backend can record where
// recipes are opened and cooked from.
export function openRecipe(recipeId: string, source: RecipeSource) {
  router.push({
    pathname: "/recipes/[id]",
    params: { id: recipeId, source },
  });
}
