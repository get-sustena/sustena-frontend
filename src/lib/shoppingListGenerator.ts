// src/lib/shoppingListGenerator.ts

import { Recipe, RecipeIngredient, UnitMode } from "../data/recipes";
import { ShoppingListItem } from "../types/shoppingList";
import { createLocalId } from "./id";
import { IngredientUnitSelections } from "./ingredientUnits";
import { scaleAmountText } from "./scaling";

type GenerateShoppingListItemsArgs = {
  recipe: Recipe;
  selectedServings: number;
  unitMode?: UnitMode;
  ingredientUnitSelections?: IngredientUnitSelections;
  ingredientAmountOverrides?: Record<string, string>;
};

const PREPARED_COMPONENT_CATEGORY_PATTERN =
  /prepared[\s_-]*components?|sub[\s_-]*recipes?/i;
const PREPARED_COMPONENT_NAME_PATTERN =
  /^(prepared\s+)?(tomato stew|prepared sauce|chicken stock already prepared)$/i;

export function generateShoppingListItemsFromRecipe({
  recipe,
  selectedServings,
  unitMode = "metric",
  ingredientUnitSelections,
  ingredientAmountOverrides,
}: GenerateShoppingListItemsArgs): ShoppingListItem[] {
  const now = new Date().toISOString();
  const purchasableIngredients = recipe.ingredients.filter(
    isPurchasableRecipeIngredient
  );

  return purchasableIngredients.map((ingredient) => {
    const selectedUnitMode =
      ingredientUnitSelections?.[ingredient.id] ?? unitMode;
    const amountOverride = ingredientAmountOverrides?.[ingredient.id];
    const scaledAmount =
      amountOverride ??
      scaleAmountText({
        amount: getIngredientAmount({
          ingredient,
          selectedUnitMode,
          fallbackUnitMode: unitMode,
        }),
        baseServings: recipe.baseServings,
        selectedServings,
      });

    return {
      id: createLocalId("shopping_item"),
      name: ingredient.name,
      emoji: ingredient.emoji,
      quantity: scaledAmount,
      category: ingredient.category,
      estimatedPrice: null,
      priceStatus: "unknown",
      checked: false,
      sourceRecipeId: recipe.id,
      createdAt: now,
      updatedAt: now,
    };
  });
}

export function isPurchasableRecipeIngredient(ingredient: {
  category?: string | null;
  name?: string | null;
  ingredientName?: string | null;
  canonicalIngredientName?: string | null;
}) {
  const category = ingredient.category ?? "";
  const name =
    ingredient.name ??
    ingredient.ingredientName ??
    ingredient.canonicalIngredientName ??
    "";

  if (PREPARED_COMPONENT_CATEGORY_PATTERN.test(category)) {
    return false;
  }

  if (
    PREPARED_COMPONENT_NAME_PATTERN.test(name) &&
    /prepared|already prepared/i.test(name)
  ) {
    return false;
  }

  return true;
}

function getIngredientAmount({
  ingredient,
  selectedUnitMode,
  fallbackUnitMode,
}: {
  ingredient: RecipeIngredient;
  selectedUnitMode: UnitMode | string;
  fallbackUnitMode: UnitMode;
}) {
  if (selectedUnitMode === "metric" || selectedUnitMode === "cups" || selectedUnitMode === "imperial") {
    return ingredient.amount[selectedUnitMode] ?? getFallbackAmount(ingredient, fallbackUnitMode);
  }

  const selectedIndex = Number(selectedUnitMode);
  const selectedAvailableUnit = Number.isNaN(selectedIndex)
    ? undefined
    : ingredient.availableUnits?.[selectedIndex];

  return (
    selectedAvailableUnit?.label ??
    getFallbackAmount(ingredient, fallbackUnitMode)
  );
}

function getFallbackAmount(ingredient: RecipeIngredient, fallbackUnitMode: UnitMode) {
  return (
    ingredient.displayText ??
    ingredient.amount[fallbackUnitMode] ??
    (ingredient.rawText || "as needed")
  );
}
