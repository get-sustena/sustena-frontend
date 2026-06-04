// src/lib/shoppingListGenerator.ts

import { Recipe, UnitMode } from "../data/recipes";
import { ShoppingListItem } from "../types/shoppingList";
import { createLocalId } from "./id";
import { IngredientUnitSelections } from "./ingredientUnits";
import { scaleAmountText } from "./scaling";

type GenerateShoppingListItemsArgs = {
  recipe: Recipe;
  selectedServings: number;
  unitMode?: UnitMode;
  ingredientUnitSelections?: IngredientUnitSelections;
};

export function generateShoppingListItemsFromRecipe({
  recipe,
  selectedServings,
  unitMode = "metric",
  ingredientUnitSelections,
}: GenerateShoppingListItemsArgs): ShoppingListItem[] {
  const now = new Date().toISOString();

  return recipe.ingredients.map((ingredient) => {
    const selectedUnitMode =
      ingredientUnitSelections?.[ingredient.id] ?? unitMode;

    const baseAmount = ingredient.amount[selectedUnitMode];

    const scaledAmount = scaleAmountText({
      amount: baseAmount,
      baseServings: recipe.baseServings,
      selectedServings,
    });

    const estimatedPrice = Math.round(recipe.cost / recipe.ingredients.length);

    return {
      id: createLocalId("shopping_item"),
      name: ingredient.name,
      emoji: ingredient.emoji,
      quantity: scaledAmount,
      category: ingredient.category,
      estimatedPrice,
      checked: false,
      sourceRecipeId: recipe.id,
      createdAt: now,
      updatedAt: now,
    };
  });
}
