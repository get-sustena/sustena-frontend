import { useSQLiteContext } from "expo-sqlite";
import { useState } from "react";
import { getLocalRecipeById } from "../db/recipeRows";
import { recipesApi } from "../lib/api";
import { selectionFromRecipe } from "../lib/shopping/recipeMerge";
import { showToast } from "../store/uiStore";
import { useAddToShoppingList } from "./useAddToShoppingList";

type PlanMealServings = { recipeId: string; servings: number; day: number };

// "Add to shopping list" on a meal plan (SL-06): the same list choice and
// review as a recipe, with each recipe once and its servings summed. Uses
// the recipes saved on the phone, so it works offline. Used by the planner,
// Saved meal plans and a saved plan's screen.
export function useAddPlanToList() {
  const db = useSQLiteContext();
  const addToShoppingList = useAddToShoppingList();
  const [isAdding, setIsAdding] = useState(false);

  // `name` is the saved plan's name; an unsaved plan is named by its length,
  // as in the prototype.
  async function addPlanToList(meals: PlanMealServings[], name?: string) {
    if (meals.length === 0 || isAdding) return;
    setIsAdding(true);
    try {
      const servingsByRecipe = new Map<string, number>();
      for (const meal of meals) {
        servingsByRecipe.set(meal.recipeId, (servingsByRecipe.get(meal.recipeId) ?? 0) + meal.servings);
      }
      const recipes = await Promise.all(
        [...servingsByRecipe.keys()].map(
          async (recipeId) => (await getLocalRecipeById(db, recipeId)) ?? (await recipesApi.getRecipeById(recipeId).catch(() => null))
        )
      );
      if (recipes.some((recipe) => !recipe)) {
        showToast("Connect to the internet to add these recipes", "danger");
        return;
      }
      const days = new Set(meals.map((meal) => meal.day)).size;
      addToShoppingList({
        title: name ?? (days > 1 ? "Week meal plan" : "Daily meal plan"),
        defaultName: name ?? (days > 1 ? "Week Meal Plan" : "Daily Meal Plan"),
        selections: recipes.map((recipe) => selectionFromRecipe(recipe!, servingsByRecipe.get(recipe!.id) ?? 1)),
      });
    } finally {
      setIsAdding(false);
    }
  }

  return { addPlanToList, isAdding };
}
