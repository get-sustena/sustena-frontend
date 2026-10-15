
import { Recipe, UnitMode } from "../data/recipes";

type IngredientUnitSelections = Record<string, UnitMode | string>;

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
