import assert from "node:assert/strict";
import { test } from "node:test";
import { insertShoppingListItem, mapShoppingListRowToItem } from "../src/db/shoppingItemRows.ts";
import { recipeNeedsLine } from "../src/lib/shopping/recipeNeeds.ts";
import { openTestDatabase } from "./helpers/sqlite.mjs";

const jollof = { recipeId: "jollof", recipeName: "Jollof Rice", amount: "250", unit: "g" };
const friedRice = { recipeId: "fried-rice", recipeName: "Fried Rice", amount: "100", unit: "g" };

test("SL-03: an item from one recipe says what the recipe needs", () => {
  assert.equal(recipeNeedsLine({ recipeAmount: "250 g", sources: [jollof] }), "Recipe needs 250 g");
});

test("SL-03: an item from two recipes also says how many", () => {
  assert.equal(recipeNeedsLine({ recipeAmount: "350 g", sources: [jollof, friedRice] }), "Recipe needs 350 g · 2 recipes");
});

test("SL-03: one recipe in two units counts once", () => {
  const cups = { ...jollof, amount: "1", unit: "metric cup" };
  assert.equal(
    recipeNeedsLine({ recipeAmount: "1 metric cup + 250 g", sources: [jollof, cups] }),
    "Recipe needs 1 metric cup + 250 g"
  );
});

test("SL-03: recipes with no amount still say how many recipes", () => {
  assert.equal(recipeNeedsLine({ recipeAmount: null, sources: [jollof, friedRice] }), "2 recipes");
});

test("SL-03: items typed in by hand get no line", () => {
  assert.equal(recipeNeedsLine({ recipeAmount: null, sources: [] }), null);
  assert.equal(recipeNeedsLine({}), null);
});

test("SL-03: the phone keeps what each item's recipes need, so it shows offline", async () => {
  const { db } = await openTestDatabase();
  await insertShoppingListItem(db, {
    id: "item-1",
    name: "Rice",
    emoji: "🛒",
    quantity: "1 kg",
    category: "Grains",
    estimatedPrice: null,
    checked: false,
    recipeAmount: "350 g",
    sources: [jollof, friedRice],
    createdAt: "2026-10-15T00:00:00.000Z",
    updatedAt: "2026-10-15T00:00:00.000Z",
    listId: "list-1",
  });

  const item = mapShoppingListRowToItem(await db.getFirstAsync("SELECT * FROM shopping_list_items WHERE id = 'item-1'"));
  assert.equal(item.recipeAmount, "350 g");
  assert.deepEqual(item.sources, [jollof, friedRice]);
});
