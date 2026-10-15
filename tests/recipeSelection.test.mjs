import assert from "node:assert/strict";
import { test } from "node:test";
import { selectionFromRecipe } from "../src/lib/shopping/recipeMerge.ts";

const detail = {
  id: "jollof",
  name: "Jollof Rice",
  baseServings: 4,
  ingredients: [
    { id: "l1", ingredientId: "rice", ingredientName: "Long grain rice", canonicalIngredientName: "long grain rice", rawText: "2 cups rice", quantity: "2.000000", unit: "metric_cup", category: "Grains", isOptional: false },
    { id: "l2", ingredientId: null, ingredientName: null, canonicalIngredientName: null, rawText: "Salt to taste", quantity: null, unit: null, category: null, isOptional: false },
    { id: "l3", ingredientId: "mint", ingredientName: "Mint", canonicalIngredientName: "mint", rawText: "mint", quantity: 5, unit: "g", category: "Herbs", isOptional: true },
  ],
};

test("SL-06: a stored recipe becomes the lines the server adds, with the unit the person picked", () => {
  const selection = selectionFromRecipe(detail, 6, [{ ingredientId: "l1", unit: "mL" }]);
  assert.deepEqual(selection.recipe, {
    id: "jollof",
    name: "Jollof Rice",
    baseServings: 4,
    lines: [
      { id: "l1", ingredientId: "rice", name: "Long grain rice", canonicalIngredientName: "long grain rice", quantity: 2, unit: "metric_cup", category: "Grains", isOptional: false },
      { id: "l2", ingredientId: null, name: "Salt to taste", canonicalIngredientName: null, quantity: null, unit: null, category: null, isOptional: false },
      { id: "l3", ingredientId: "mint", name: "Mint", canonicalIngredientName: "mint", quantity: 5, unit: "g", category: "Herbs", isOptional: true },
    ],
  });
  assert.equal(selection.servings, 6);
  assert.deepEqual(selection.unitOverrides, { l1: "mL" });
});

test("SL-06: the list works from the recipe's exact stored amount, not the rounded one the recipe page shows", () => {
  const exact = { ...detail, ingredients: [{ ...detail.ingredients[0], quantity: "0.42", exactQuantity: "0.417" }] };
  assert.equal(selectionFromRecipe(exact, 4).recipe.lines[0].quantity, 0.417);

  const older = { ...detail, ingredients: [{ ...detail.ingredients[0], quantity: "0.42" }] };
  assert.equal(selectionFromRecipe(older, 4).recipe.lines[0].quantity, 0.42);
});
