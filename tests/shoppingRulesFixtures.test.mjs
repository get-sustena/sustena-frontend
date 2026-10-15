import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { reviewRecipeAdd, toStoredItem } from "../src/lib/shopping/addReview.ts";
import { selectionFromRecipe } from "../src/lib/shopping/recipeMerge.ts";

// Cases the server generates from its own functions
// (cookease-backend docs/exports/shopping_rules_fixtures.json, made by
// app/scripts/export_shopping_rules_fixtures.py). The phone's copy of the
// rules must give exactly the same list (SL-06).
const fixtures = JSON.parse(readFileSync(new URL("./fixtures-shopping-rules.json", import.meta.url), "utf8"));
const units = new Map(fixtures.units.map((unit) => [unit.id, unit]));
const subcategories = new Map(fixtures.ingredients.map((ingredient) => [ingredient.id, ingredient.subcategory]));
const subcategoryOf = (ingredientId) => (ingredientId ? subcategories.get(ingredientId) ?? null : null);
const amountText = (value) => (value === null || value === undefined ? null : String(Number(Number(value).toFixed(10))));
const byNameThenUnit = (a, b) => a.name.localeCompare(b.name) || (a.unit ?? "").localeCompare(b.unit ?? "");

for (const fixture of fixtures.cases) {
  test(`SL-06 server fixture: ${fixture.name}`, () => {
    const rows = fixture.existingRows.map((row, index) => ({
      id: `existing-${index}`,
      name: row.name,
      canonicalIngredientName: null,
      ingredientId: row.ingredientId,
      amount: row.amount === null ? null : Number(row.amount),
      quantity: row.amount ?? row.displayQuantity,
      unit: row.unit,
      category: "other",
      checked: row.checked,
      sources: row.sources,
    }));
    const recipes = new Map(fixture.recipes.map((recipe) => [recipe.id, { ...recipe, name: `Recipe ${recipe.id}` }]));
    const selections = fixture.add.map((added) => selectionFromRecipe(recipes.get(added.recipeId), added.servings, added.unitOverrides));
    const review = reviewRecipeAdd({
      rows,
      selections,
      units,
      pantryIngredientIds: new Set(fixture.pantryIngredientIds),
      subcategoryOf,
    });

    const changed = new Map([...review.mergedRows, ...review.newRows].map((row) => [row.id, row]));
    const after = [...rows.map((row) => changed.get(row.id) ?? row), ...review.newRows].map((row) => {
      const existingRow = rows.findIndex((input) => input.id === row.id);
      const untouched = existingRow >= 0 && !changed.has(row.id);
      const stored = toStoredItem(row, { listId: "list", createdAt: "", updatedAt: "" }, subcategoryOf(row.ingredientId ?? null));
      return {
        id: row.id,
        name: row.name,
        ingredientId: row.ingredientId ?? null,
        amount: amountText(row.amount),
        unit: row.unit,
        displayQuantity: untouched ? fixture.existingRows[existingRow].displayQuantity : stored.displayQuantity || null,
        checked: row.checked,
        recipeAmount: untouched ? fixture.existingRows[existingRow].recipeAmount : stored.recipeAmount,
        sources: row.sources,
        existingRow: existingRow >= 0 ? existingRow : null,
      };
    });
    after.sort(byNameThenUnit);

    assert.deepEqual(
      after.map(({ id, ...row }) => row),
      fixture.expected.rows
    );
    const positions = new Map(fixture.recipes.flatMap((recipe) => recipe.ingredients.map((line) => [`${recipe.id}|${line.id}`, `${recipe.id}/${line.position}`])));
    const landedAt = new Map(Object.entries(review.landed).map(([key, rowId]) => [positions.get(key), after.findIndex((row) => row.id === rowId)]));
    assert.deepEqual(
      fixture.expected.lineItems.map((line) => ({ clientLineId: line.clientLineId, row: landedAt.get(line.clientLineId) ?? null })),
      fixture.expected.lineItems
    );
    assert.deepEqual(review.inPantry, fixture.expected.skippedInPantry);
  });
}
