import assert from "node:assert/strict";
import { test } from "node:test";
import { insertShoppingListItem } from "../src/db/shoppingItemRows.ts";
import { reviewRecipeAdd } from "../src/lib/shopping/addReview.ts";
import { createShoppingCommands } from "../src/lib/shopping/shoppingCommands.ts";
import { runShoppingCommand } from "../src/lib/shopping/shoppingReplay.ts";
import { replayOutbox } from "../src/lib/sync/outboxReplay.ts";
import { openTestDatabase } from "./helpers/sqlite.mjs";

const LIST = "list-1";
const RICE_ROW = "00000000-0000-4000-8000-0000000000a1";
const units = new Map(
  [
    { id: "g", baseUnit: "g", baseFactorMin: "1", baseFactorMax: "1", isApproximate: false },
    { id: "kg", baseUnit: "g", baseFactorMin: "1000", baseFactorMax: "1000", isApproximate: false },
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
  recipe: { id: "jollof", name: "Jollof Rice", baseServings: 2, lines: [line("j-rice", "rice", 250, "g"), line("j-rice-extra", "rice", 0.1, "kg"), line("j-tomato", "tomato", 3, null)] },
  servings: 4,
};

// Like the server: recipe lines merge into the row for the same ingredient.
function fakeServer() {
  const items = new Map([[RICE_ROW, { id: RICE_ROW, shoppingListId: LIST, ingredientId: "rice", name: "Rice", checked: false }]]);
  let next = 1;
  return {
    items,
    api: {
      async addRecipesToShoppingList(listId, { lines = [] }) {
        const lineItems = lines.map((sent) => {
          const ingredientId = sent.recipeIngredientId.startsWith("j-rice") ? "rice" : "tomato";
          let item = [...items.values()].find((existing) => existing.ingredientId === ingredientId);
          if (!item) {
            const id = `00000000-0000-4000-8000-${String(next++).padStart(12, "0")}`;
            item = { id, shoppingListId: listId, ingredientId, name: "Tomato", checked: false };
            items.set(id, item);
          }
          return { clientLineId: sent.clientLineId, itemId: item.id };
        });
        return { id: listId, items: [...items.values()], lineItems };
      },
      async updateShoppingListItemInList(listId, itemId, { checked }) {
        items.get(itemId).checked = checked;
        return { ...items.get(itemId) };
      },
    },
  };
}

const toLocalItem = (item) => ({
  id: item.id,
  name: item.name,
  emoji: "🛒",
  quantity: "1",
  category: "grains",
  estimatedPrice: null,
  checked: item.checked,
  createdAt: "2026-10-15T00:00:00.000Z",
  updatedAt: "2026-10-15T00:00:00.000Z",
  listId: item.shoppingListId,
});

let idCounter = 0;
const commandsFor = ({ db, transact }) =>
  createShoppingCommands({
    db,
    transact,
    now: () => "2026-10-15T12:00:00.000Z",
    newId: (prefix) => `${prefix}_${++idCounter}`,
    requestSync: () => undefined,
  });
let clock = 0;
function replay({ db, transact }, server) {
  clock += 60 * 60_000;
  return replayOutbox(
    db,
    (database, operation) => runShoppingCommand(database, operation, { api: server.api, toLocalItem, transact, now: () => clock }),
    { isOnline: () => true, isStopped: () => false, now: () => clock }
  );
}

// A list holding 800 g of rice, already on the server.
async function listWithRice() {
  const database = await openTestDatabase();
  await insertShoppingListItem(database.db, {
    id: RICE_ROW,
    name: "Rice",
    canonicalIngredientName: "rice",
    ingredientId: "rice",
    emoji: "🛒",
    quantity: "800 g",
    amount: 0.8,
    unit: "kg",
    category: "grains",
    estimatedPrice: null,
    checked: false,
    createdAt: "2026-10-15T00:00:00.000Z",
    updatedAt: "2026-10-15T00:00:00.000Z",
    listId: LIST,
  });
  const rows = [{ id: RICE_ROW, name: "Rice", canonicalIngredientName: "rice", ingredientId: "rice", amount: 0.8, quantity: "0.8", unit: "kg", category: "grains", checked: false, sources: [] }];
  const review = reviewRecipeAdd({ rows, selections: [jollof], units, pantryIngredientIds: new Set(), ingredientOf: () => null });
  return { database, review };
}
const shown = (db) => db.getAllAsync("SELECT name, display_quantity, recipe_amount FROM shopping_list_items WHERE list_id = ? ORDER BY name", [LIST]);
const recipes = [{ recipeId: "jollof", servings: 4 }];

test("SL-06: adding after the review saves exactly what the review showed, offline, with one outbox command", async () => {
  const { database, review } = await listWithRice();
  await commandsFor(database).addReviewedRecipes({ listId: LIST, recipes, review });

  assert.deepEqual(review.rows.map((row) => [row.name, row.listQuantity]), [["Rice", "2 kg"], ["Tomato", "6 pieces"]]);
  assert.deepEqual(await shown(database.db), [
    { name: "Rice", display_quantity: "2 kg", recipe_amount: "500 g + 0.2 kg" },
    { name: "Tomato", display_quantity: "6 pieces", recipe_amount: "6 pieces" },
  ]);
  const queued = await database.db.getAllAsync("SELECT kind, payload_json FROM sync_queue");
  assert.deepEqual(queued.map((row) => row.kind), ["shopping_list_recipe_batch"]);
  const { lines } = JSON.parse(queued[0].payload_json);
  // Both rice lines landed in the one rice row; each still has its own id.
  assert.equal(lines.filter((sent) => sent.id === RICE_ROW).length, 2);
  assert.equal(new Set(lines.map((sent) => sent.clientLineId)).size, lines.length);
  assert.equal(lines.find((sent) => sent.recipeIngredientId === "j-rice").id, RICE_ROW);
});

test("SL-06: a tick on a row the recipe added offline reaches the server's row", async () => {
  const { database, review } = await listWithRice();
  const commands = commandsFor(database);
  await commands.addReviewedRecipes({ listId: LIST, recipes, review });
  const tomato = await database.db.getFirstAsync("SELECT id FROM shopping_list_items WHERE name = 'Tomato'");
  await commands.setChecked({ listId: LIST, itemId: tomato.id, checked: true });

  const server = fakeServer();
  await replay(database, server);
  const serverTomato = [...server.items.values()].find((item) => item.name === "Tomato");
  assert.equal(serverTomato.checked, true);
  assert.equal(await database.db.getFirstAsync("SELECT COUNT(*) AS count FROM sync_queue").then((row) => row.count), 0);
});
