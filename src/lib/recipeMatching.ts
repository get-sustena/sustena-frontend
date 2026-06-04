// src/lib/recipeMatching.ts

import { Recipe } from "../data/recipes";

export type RecipeMatch = {
  recipe: Recipe;
  score: number;
  matchedIngredients: string[];
  missingIngredients: string[];
};

export function matchRecipesByIngredients({
  recipes,
  selectedIngredientNames,
}: {
  recipes: Recipe[];
  selectedIngredientNames: string[];
}): RecipeMatch[] {
  const selected = selectedIngredientNames.map((item) => normalizeText(item));

  if (selected.length === 0) {
    return [];
  }

  return recipes
    .map((recipe) => {
      const recipeIngredients = recipe.ingredients.map((ingredient) => ({
        name: ingredient.name,
        normalizedName: normalizeText(ingredient.name),
      }));

      const matchedIngredients = recipeIngredients
        .filter((ingredient) =>
          selected.some(
            (selectedName) =>
              ingredient.normalizedName.includes(selectedName) ||
              selectedName.includes(ingredient.normalizedName)
          )
        )
        .map((ingredient) => ingredient.name);

      const missingIngredients = recipeIngredients
        .filter((ingredient) => !matchedIngredients.includes(ingredient.name))
        .map((ingredient) => ingredient.name);

      const score =
        matchedIngredients.length / Math.max(recipeIngredients.length, 1);

      return {
        recipe,
        score,
        matchedIngredients,
        missingIngredients,
      };
    })
    .filter((match) => match.score > 0)
    .sort((a, b) => b.score - a.score);
}

function normalizeText(value: string) {
  return value.trim().toLowerCase();
}
