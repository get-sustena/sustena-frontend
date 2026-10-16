import assert from "node:assert/strict";
import { test } from "node:test";
import { generateItemsFromRecipes, mergeWithExisting, normalizeCategory } from "../src/lib/shopping/recipeMerge.ts";

const units = new Map(
  [
    { id: "g", baseUnit: "g", baseFactorMin: "1", baseFactorMax: "1", isApproximate: false },
    { id: "kg", baseUnit: "g", baseFactorMin: "1000", baseFactorMax: "1000", isApproximate: false },
    { id: "rice_derica_small", baseUnit: "g", baseFactorMin: "350", baseFactorMax: "450", isApproximate: true },
  ].map((unit) => [unit.id, unit])
);
const line = (id, name, quantity, unit, extra = {}) => ({
  id,
  ingredientId: name,
  name,
  canonicalIngredientName: name,
  quantity,
  unit,
  category: "grains",
  isOptional: false,
  ...extra,
});
const recipe = (id, baseServings, lines) => ({ id, name: id, baseServings, lines });

test("SL-06 port: a line with no amount joins the row's recipes without changing its amount", () => {
  const [salt] = generateItemsFromRecipes([{ recipe: recipe("r", 1, [line("a", "salt", null, null)]), servings: 1 }], units);
  const rows = [{ id: "row-1", name: "Salt", canonicalIngredientName: "salt", amount: 1, quantity: "1", unit: "tbsp", category: "other", checked: false, sources: [] }];
  const merged = mergeWithExisting(rows, salt, units);
  assert.equal(merged?.amount, 1);
  assert.deepEqual(merged?.sources, [{ recipeId: "r", recipeName: "r", amount: null, unit: null }]);
});

test("SL-06 port: categories read as the server's", () => {
  assert.equal(normalizeCategory("Vegetables"), "produce");
  assert.equal(normalizeCategory("herbs-spices"), "herbs_spices");
  assert.equal(normalizeCategory("Snacks"), "other");
  assert.equal(normalizeCategory(null), "other");
});
