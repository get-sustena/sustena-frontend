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

test("SL-06 port: lines scale by servings and the same ingredient in the same unit adds up across recipes", () => {
  const [rice] = generateItemsFromRecipes(
    [
      { recipe: recipe("jollof", 4, [line("j1", "rice", 500, "g")]), servings: 2 },
      { recipe: recipe("fried", 2, [line("f1", "rice", 100, "g")]), servings: 2 },
    ],
    units
  );
  assert.equal(rice.quantity, 350);
  assert.deepEqual(rice.sourceLines, ["jollof|j1", "fried|f1"]);
  assert.deepEqual(rice.sources.map((source) => [source.recipeId, source.amount, source.unit]), [
    ["jollof", "250", "g"],
    ["fried", "100", "g"],
  ]);
});

test("SL-06 port: another unit joins only by an exact conversion, never an approximate one", () => {
  const items = generateItemsFromRecipes(
    [
      {
        recipe: recipe("r", 1, [line("a", "rice", 1, "kg"), line("b", "rice", 250, "g"), line("c", "rice", 1, "rice_derica_small")]),
        servings: 1,
      },
    ],
    units
  );
  assert.deepEqual(items.map((item) => [item.unit, item.quantity]), [
    ["kg", 1.25],
    ["rice_derica_small", 1],
  ]);
});

test("SL-06 port: optional lines are left out", () => {
  const items = generateItemsFromRecipes(
    [{ recipe: recipe("r", 1, [line("a", "rice", 1, "kg"), line("b", "mint", 5, "g", { isOptional: true })]), servings: 1 }],
    units
  );
  assert.deepEqual(items.map((item) => item.name), ["rice"]);
});

test("SL-06 port: a recipe merges into a list row in that row's unit; a typed quantity gets its own row", () => {
  const [rice] = generateItemsFromRecipes([{ recipe: recipe("r", 1, [line("a", "rice", 500, "g")]), servings: 1 }], units);
  const rows = [{ id: "row-1", name: "Rice", canonicalIngredientName: "rice", amount: 1, quantity: "1", unit: "kg", category: "grains", checked: false, sources: [] }];
  const merged = mergeWithExisting(rows, rice, units);
  assert.equal(merged?.id, "row-1");
  assert.equal(merged?.amount, 1.5);

  const typed = [{ id: "row-2", name: "rice", amount: null, quantity: "a small bag", unit: null, category: "grains", checked: false, sources: [] }];
  assert.equal(mergeWithExisting(typed, rice, units), null);
});

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
