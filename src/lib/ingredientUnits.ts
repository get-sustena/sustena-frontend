// src/lib/ingredientUnits.ts

import { Recipe, UnitMode } from "../data/recipes";

export type IngredientUnitSelections = Record<string, UnitMode>;

export function createInitialIngredientUnitSelections({
  recipe,
  defaultUnitMode,
}: {
  recipe: Recipe;
  defaultUnitMode: UnitMode;
}): IngredientUnitSelections {
  return recipe.ingredients.reduce<IngredientUnitSelections>(
    (acc, ingredient) => {
      acc[ingredient.id] = defaultUnitMode;
      return acc;
    },
    {}
  );
}

export function getNextUnitMode(current: UnitMode): UnitMode {
  if (current === "metric") return "cups";
  if (current === "cups") return "imperial";
  return "metric";
}

export function getUnitModeLabel(unitMode: UnitMode) {
  if (unitMode === "metric") return "g/mL";
  if (unitMode === "cups") return "cups";
  return "oz/lb";
}
