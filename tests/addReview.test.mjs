import assert from "node:assert/strict";
import { test } from "node:test";
import { destinationSummary, reviewRecipeAdd } from "../src/lib/shopping/addReview.ts";
import { recipeAmountText } from "../src/lib/shopping/shoppingRules.ts";

const units = new Map(
  [
    { id: "g", baseUnit: "g", baseFactorMin: "1", baseFactorMax: "1", isApproximate: false },
    { id: "kg", baseUnit: "g", baseFactorMin: "1000", baseFactorMax: "1000", isApproximate: false },
    { id: "mL", baseUnit: "mL", baseFactorMin: "1", baseFactorMax: "1", isApproximate: false },
    { id: "metric_cup", baseUnit: "mL", baseFactorMin: "250", baseFactorMax: "250", isApproximate: false },
  ].map((unit) => [unit.id, unit])
);
const line = (id, name, quantity, unit) => ({
  id,
  ingredientId: name,
  name: name[0].toUpperCase() + name.slice(1),
  canonicalIngredientName: name,
  quantity,
  unit,
  category: "grains",
  isOptional: false,
});
const jollof = {
  recipe: {
    id: "jollof",
    name: "Jollof Rice",
    baseServings: 4,
    lines: [line("j1", "rice", 500, "g"), line("j2", "tomato", 6, null), line("j3", "salt", 2, "g"), line("j4", "curry", 0.1, "metric_cup")],
  },
  servings: 4,
};
const row = (id, name, amount, unit, checked = false) => ({
  id,
  name: name[0].toUpperCase() + name.slice(1),
  canonicalIngredientName: name,
  ingredientId: name,
  amount,
  quantity: String(amount),
  unit,
  category: "grains",
  checked,
  sources: [],
});
const subcategories = { curry: "Spice blend" };
const review = (rows, pantry = []) =>
  reviewRecipeAdd({ rows, selections: [jollof], units, pantryIngredientIds: new Set(pantry), subcategoryOf: (id) => subcategories[id] ?? null });

test("SL-06: the server's recipeAmount text, exact to 2 places", () => {
  assert.equal(recipeAmountText([{ recipeId: "a", recipeName: "A", amount: "200", unit: "g" }, { recipeId: "b", recipeName: "B", amount: "100", unit: "g" }]), "300 g");
  assert.equal(recipeAmountText([{ recipeId: "a", recipeName: "A", amount: "0.333333", unit: "metric_cup" }]), "0.33 metric cups");
  assert.equal(
    recipeAmountText([{ recipeId: "a", recipeName: "A", amount: "1", unit: "metric_cup" }, { recipeId: "b", recipeName: "B", amount: "250", unit: "mL" }]),
    "1 metric cup + 250 mL"
  );
  assert.equal(recipeAmountText([{ recipeId: "a", recipeName: "A", amount: null, unit: null }]), null);
});

test("SL-06: on an empty list every ingredient is new, each with the list quantity it will have", () => {
  const result = review([]);
  assert.deepEqual(
    result.rows.map((entry) => [entry.name, entry.recipeNeeds, entry.alreadyListed, entry.listQuantity]),
    [
      ["Rice", "500 g", false, "500 g"],
      ["Tomato", "6 pieces", false, "6 pieces"],
      ["Salt", "2 g", false, "2 g"],
      ["Curry", "0.1 metric cups", false, "2 tbsp"],
    ]
  );
  assert.equal(destinationSummary(result), "4 new · 0 already listed");
  assert.equal(result.newRows.length, 4);
});

test("SL-06: an ingredient already listed merges, and the review shows the merged list quantity", () => {
  const result = review([row("r1", "rice", 0.8, "kg")]);
  const rice = result.rows.find((entry) => entry.name === "Rice");
  assert.deepEqual([rice.alreadyListed, rice.recipeNeeds, rice.listQuantity], [true, "500 g", "2 kg"]);
  assert.equal(result.mergedRows[0].amount, 1.3);
  assert.equal(destinationSummary(result), "3 new · 1 already listed");
});

test("SL-06: ingredients in the person's pantry, or ticked on the list, are left off", () => {
  const result = review([row("r1", "tomato", 2, null, true)], ["salt"]);
  assert.deepEqual(result.inPantry, [
    { ingredientId: "tomato", name: "Tomato" },
    { ingredientId: "salt", name: "Salt" },
  ]);
  assert.deepEqual(result.rows.map((entry) => entry.name), ["Rice", "Curry"]);
  assert.equal(result.mergedRows.length, 0);
});

test("SL-06: everything in the pantry leaves nothing to add", () => {
  const result = review([], ["rice", "tomato", "salt", "curry"]);
  assert.deepEqual(result.rows, []);
  assert.equal(result.newRows.length, 0);
});
