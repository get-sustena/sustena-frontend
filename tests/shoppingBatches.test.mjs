import assert from "node:assert/strict";
import { test } from "node:test";
import { createShoppingCommands } from "../src/lib/shopping/shoppingCommands.ts";
import { runShoppingCommand } from "../src/lib/shopping/shoppingReplay.ts";
import { replayOutbox } from "../src/lib/sync/outboxReplay.ts";
import { openTestDatabase, testDatabasePath } from "./helpers/sqlite.mjs";

const LIST = "list-1";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

// Each recipe's shopping lines, as the server generates them.
const RECIPE_LINES = {
  jollof: [
    { recipeIngredientId: "ri-jollof-rice", ingredientId: "ing-rice", name: "Long grain rice" },
    { recipeIngredientId: "ri-jollof-tomato", ingredientId: "ing-tomato", name: "Tomatoes" },
  ],
  stew: [{ recipeIngredientId: "ri-stew-tomato", ingredientId: "ing-tomato", name: "Tomatoes" }],
  // A line the catalogue doesn't know: it never merges, and its name is
  // the same as a manual item's (SOL-03).
  porridge: [{ recipeIngredientId: "ri-porridge-rice", ingredientId: null, name: "Rice" }],
};

// Like the real server: a recipe line for an ingredient already on the list
// merges into that row; the same clientMutationId again changes nothing; ids
// that aren't its own are refused.
// `lineItems: false` is a server from before the line mapping.
function fakeServer({ lineItems: answersLineItems = true } = {}) {
  const items = new Map();
  const batches = new Map();
  const calls = [];
  let next = 1;
  const failNext = [];
  const maybeFail = (when) => {
    if (failNext[0]?.when === when) {
      const { status } = failNext.shift();
      throw Object.assign(new Error(`status ${status}`), { status });
    }
  };
  const live = () => [...items.values()].filter((item) => !item.deletedAt);
  const list = () => ({ id: LIST, items: live().map((item) => ({ ...item })) });
  const own = (itemId) => {
    if (!UUID.test(itemId) || !items.has(itemId)) throw Object.assign(new Error("Not found"), { status: 422 });
    return items.get(itemId);
  };
  return {
    items,
    calls,
    live,
    failOnce(...failures) {
      failNext.push(...failures);
    },
    api: {
      async addRecipesToShoppingList(listId, { clientMutationId, recipes, lines = [] }) {
        calls.push(["batch", clientMutationId]);
        maybeFail("before");
        if (!batches.has(clientMutationId)) {
          // Where each recipe line landed, kept with the batch for replays.
          const landed = new Map();
          for (const { recipeId } of recipes) {
            for (const { recipeIngredientId, ingredientId, name } of RECIPE_LINES[recipeId]) {
              const existing = ingredientId ? live().find((item) => item.ingredientId === ingredientId) : undefined;
              let id = existing?.id;
              if (!id) {
                id = `00000000-0000-4000-8000-${String(next++).padStart(12, "0")}`;
                items.set(id, { id, shoppingListId: listId, recipeId, ingredientId, name, checked: false, deletedAt: null });
              }
              landed.set(recipeIngredientId, id);
            }
          }
          batches.set(
            clientMutationId,
            lines.map((line) => ({ clientLineId: line.clientLineId, itemId: landed.get(line.recipeIngredientId) ?? null }))
          );
        }
        maybeFail("after");
        return answersLineItems ? { ...list(), lineItems: batches.get(clientMutationId) } : list();
      },
      async addShoppingListItemToList(listId, payload) {
        calls.push(["add", payload.clientMutationId]);
        maybeFail("before");
        let item = live().find((existing) => existing.clientMutationId === payload.clientMutationId);
        if (!item) {
          const id = `00000000-0000-4000-8000-${String(next++).padStart(12, "0")}`;
          item = { ...payload, id, shoppingListId: listId, checked: false, deletedAt: null };
          items.set(id, item);
        }
        maybeFail("after");
        return { ...item };
      },
      async updateShoppingListItemInList(listId, itemId, { checked }) {
        calls.push(["check", itemId]);
        maybeFail("before");
        own(itemId).checked = checked;
        maybeFail("after");
        return { ...items.get(itemId) };
      },
      async setShoppingListItemsChecked(listId, itemIds, checked) {
        calls.push(["check many", ...itemIds]);
        maybeFail("before");
        for (const itemId of itemIds) own(itemId).checked = checked;
        return list();
      },
      async deleteShoppingListItemFromList(listId, itemId) {
        calls.push(["remove", itemId]);
        maybeFail("before");
        own(itemId).deletedAt = "now";
      },
      async restoreShoppingListItemInList(listId, itemId) {
        calls.push(["restore", itemId]);
        maybeFail("before");
        own(itemId).deletedAt = null;
        return { ...items.get(itemId) };
      },
      async clearCheckedShoppingListItems(listId) {
        calls.push(["clear checked"]);
        maybeFail("before");
        for (const item of live()) if (item.checked) item.deletedAt = "now";
      },
    },
  };
}

const toLocalItem = (item) => ({
  id: item.id,
  ingredientId: item.ingredientId ?? undefined,
  name: item.name,
  emoji: "🛒",
  quantity: "1",
  category: "Pantry",
  estimatedPrice: null,
  priceStatus: "unknown",
  checked: item.checked,
  clientMutationId: item.clientMutationId ?? undefined,
  createdAt: "2026-10-14T00:00:00.000Z",
  updatedAt: "2026-10-14T00:00:00.000Z",
  listId: item.shoppingListId,
});

let idCounter = 0;
const commandsFor = ({ db, transact }) =>
  createShoppingCommands({
    db,
    transact,
    now: () => "2026-10-14T12:00:00.000Z",
    newId: (prefix) => `${prefix}_${++idCounter}`,
    requestSync: () => undefined,
  });

// What the recipe page generates: one local line per ingredient.
const generated = (recipeId) =>
  RECIPE_LINES[recipeId].map((line) => ({
    id: `shopping_item_${++idCounter}`,
    recipeIngredientId: line.recipeIngredientId,
    ingredientId: line.ingredientId ?? undefined,
    name: line.name,
    emoji: "🛒",
    quantity: "1 cup",
    category: "Pantry",
    estimatedPrice: null,
    priceStatus: "unknown",
    checked: false,
    sourceRecipeId: recipeId,
    createdAt: "2026-10-14T12:00:00.000Z",
    updatedAt: "2026-10-14T12:00:00.000Z",
  }));

const clock = { now: 0 };
function replay({ db, transact }, server) {
  clock.now += 60 * 60_000;
  return replayOutbox(
    db,
    (database, operation) =>
      runShoppingCommand(database, operation, { api: server.api, toLocalItem, transact, now: () => clock.now }),
    { isOnline: () => true, isStopped: () => false, now: () => clock.now }
  );
}

const rows = (db) => db.getAllAsync("SELECT id, name, checked FROM shopping_list_items WHERE list_id = ? ORDER BY name, id", [LIST]);
const outbox = (db) => db.getAllAsync("SELECT kind, depends_on, needs_attention FROM sync_queue ORDER BY created_at, rowid");

const addJollof = (database) =>
  commandsFor(database).addRecipes({
    listId: LIST,
    recipes: [{ recipeId: "jollof", servings: 2 }],
    items: generated("jollof"),
  });

test("QAD-02: adding a recipe saves its items and its command together, before any request", async () => {
  const database = await openTestDatabase();
  const server = fakeServer();
  await addJollof(database);

  assert.deepEqual((await rows(database.db)).map((row) => row.name), ["Long grain rice", "Tomatoes"]);
  assert.deepEqual(await outbox(database.db), [{ kind: "shopping_list_recipe_batch", depends_on: null, needs_attention: 0 }]);
  assert.deepEqual(server.calls, []);
});

test("QAD-02: killed at each step of adding a recipe, the app keeps its items and command, or neither", async () => {
  // Two items, then the command: three writes.
  for (const crashAfterWrites of [0, 1, 2]) {
    const path = testDatabasePath();
    const crashing = await openTestDatabase(path, { crashAfterWrites });
    await assert.rejects(addJollof(crashing));
    crashing.db.close();

    const restarted = await openTestDatabase(path);
    assert.deepEqual(await rows(restarted.db), [], `crash after ${crashAfterWrites} writes: no items`);
    assert.deepEqual(await outbox(restarted.db), [], `crash after ${crashAfterWrites} writes: no command`);
    restarted.db.close();
  }
});

test("F03: a recipe item checked before its batch is accepted is checked on the server under its server id", async () => {
  const database = await openTestDatabase();
  const server = fakeServer();
  const commands = commandsFor(database);
  const items = await addJollof(database);
  const rice = items.find((item) => item.name === "Long grain rice");
  await commands.setChecked({ listId: LIST, itemId: rice.id, checked: true });

  await replay(database, server);

  const serverRice = server.live().find((item) => item.ingredientId === "ing-rice");
  assert.equal(serverRice.checked, true);
  assert.deepEqual(server.calls.map(([kind, id]) => [kind, id === serverRice.id ? "server rice" : kind === "batch" ? "batch" : id]), [
    ["batch", "batch"],
    ["check", "server rice"],
  ]);
  assert.deepEqual(await outbox(database.db), []);
  assert.deepEqual(await rows(database.db), [
    { id: serverRice.id, name: "Long grain rice", checked: 1 },
    { id: server.live().find((item) => item.ingredientId === "ing-tomato").id, name: "Tomatoes", checked: 0 },
  ]);
});

test("F03: a check waits while its recipe batch can't be sent, and goes once it is", async () => {
  const database = await openTestDatabase();
  const server = fakeServer();
  const items = await addJollof(database);
  await commandsFor(database).setChecked({ listId: LIST, itemId: items[0].id, checked: true });

  server.failOnce({ when: "before", status: 0 });
  await replay(database, server);
  assert.deepEqual(server.calls.map(([kind]) => kind), ["batch"]);

  await replay(database, server);
  assert.equal(server.live().find((item) => item.ingredientId === "ing-rice").checked, true);
  assert.deepEqual(await outbox(database.db), []);
});

test("F03: two recipe lines the server merges into one row both point to that row", async () => {
  const database = await openTestDatabase();
  const server = fakeServer();
  const commands = commandsFor(database);
  await addJollof(database);
  const stewItems = await commands.addRecipes({
    listId: LIST,
    recipes: [{ recipeId: "stew", servings: 2 }],
    items: generated("stew"),
  });
  // The stew's tomatoes merge into jollof's tomatoes on the server.
  await commands.setChecked({ listId: LIST, itemId: stewItems[0].id, checked: true });

  await replay(database, server);

  const tomatoes = server.live().filter((item) => item.ingredientId === "ing-tomato");
  assert.equal(tomatoes.length, 1);
  assert.equal(tomatoes[0].checked, true);
  assert.deepEqual(await outbox(database.db), []);
  assert.deepEqual((await rows(database.db)).map((row) => [row.name, row.checked]), [
    ["Long grain rice", 0],
    ["Tomatoes", 1],
  ]);
});

test("QAD-02: removing an item saves the removal and its command together", async () => {
  const database = await openTestDatabase();
  const server = fakeServer();
  const commands = commandsFor(database);
  const item = await commands.addItem({ listId: LIST, name: "Rice", quantity: "1" });
  await replay(database, server);
  const [{ id }] = await rows(database.db);

  await commands.removeItem({ listId: LIST, itemId: id });
  assert.deepEqual(await rows(database.db), []);
  assert.deepEqual((await outbox(database.db)).map((row) => row.kind), ["shopping_list_item_remove"]);

  await replay(database, server);
  assert.deepEqual(server.live(), []);
  assert.notEqual(id, item.id);
});

test("QAD-02: killed while removing an item, the item stays or the removal is queued, never neither", async () => {
  const path = testDatabasePath();
  const first = await openTestDatabase(path);
  const server = fakeServer();
  await commandsFor(first).addItem({ listId: LIST, name: "Rice", quantity: "1" });
  await replay(first, server);
  const [{ id }] = await rows(first.db);
  first.db.close();

  const crashing = await openTestDatabase(path, { crashAfterWrites: 1 });
  await assert.rejects(commandsFor(crashing).removeItem({ listId: LIST, itemId: id }));
  crashing.db.close();

  const restarted = await openTestDatabase(path);
  assert.deepEqual((await rows(restarted.db)).map((row) => row.id), [id]);
  assert.deepEqual(await outbox(restarted.db), []);
});

test("removing an item still waiting to be created removes it everywhere once it exists", async () => {
  const database = await openTestDatabase();
  const server = fakeServer();
  const commands = commandsFor(database);
  const item = await commands.addItem({ listId: LIST, name: "Rice", quantity: "1" });
  await commands.removeItem({ listId: LIST, itemId: item.id });

  await replay(database, server);
  assert.deepEqual(server.live(), []);
  assert.deepEqual(await rows(database.db), []);
  assert.deepEqual(await outbox(database.db), []);
});

test("undoing a removal before it's sent cancels it, with no request", async () => {
  const database = await openTestDatabase();
  const server = fakeServer();
  const commands = commandsFor(database);
  await commands.addItem({ listId: LIST, name: "Rice", quantity: "1" });
  await replay(database, server);
  const [row] = await rows(database.db);
  server.calls.length = 0;

  const removed = await commands.removeItem({ listId: LIST, itemId: row.id });
  await commands.undoRemove({ listId: LIST, item: removed });

  assert.deepEqual(await rows(database.db), [row]);
  assert.deepEqual(await outbox(database.db), []);
  await replay(database, server);
  assert.deepEqual(server.calls, []);
});

test("undoing a removal that was already sent restores the item on the server", async () => {
  const database = await openTestDatabase();
  const server = fakeServer();
  const commands = commandsFor(database);
  await commands.addItem({ listId: LIST, name: "Rice", quantity: "1" });
  await replay(database, server);
  const [row] = await rows(database.db);

  const removed = await commands.removeItem({ listId: LIST, itemId: row.id });
  await replay(database, server);
  await commands.undoRemove({ listId: LIST, item: removed });
  await replay(database, server);

  assert.deepEqual(server.live().map((item) => item.id), [row.id]);
  assert.deepEqual(await rows(database.db), [row]);
});

test("QAD-02: clearing checked items removes them on the phone and queues one command", async () => {
  const database = await openTestDatabase();
  const server = fakeServer();
  const commands = commandsFor(database);
  await commands.addItem({ listId: LIST, name: "Rice", quantity: "1" });
  const beans = await commands.addItem({ listId: LIST, name: "Beans", quantity: "1" });
  await commands.setChecked({ listId: LIST, itemId: beans.id, checked: true });

  await commands.clearChecked({ listId: LIST });
  assert.deepEqual((await rows(database.db)).map((row) => row.name), ["Rice"]);

  await replay(database, server);
  assert.deepEqual(server.live().map((item) => item.name), ["Rice"]);
  assert.deepEqual(await outbox(database.db), []);
});

// SOL-03: a manual "Rice: a bunch" and a recipe's "Rice 100 g", both
// without a catalogue ingredient, are two rows with the same name.
async function twoRice(server) {
  const database = await openTestDatabase();
  const commands = commandsFor(database);
  await commands.addItem({ listId: LIST, name: "Rice", quantity: "a bunch" });
  await replay(database, server);
  const [recipeRice] = await commands.addRecipes({
    listId: LIST,
    recipes: [{ recipeId: "porridge", servings: 1 }],
    items: generated("porridge"),
  });
  await commands.setChecked({ listId: LIST, itemId: recipeRice.id, checked: true });
  await replay(database, server);
  const manual = server.live().find((item) => item.quantity === "a bunch");
  const fromRecipe = server.live().find((item) => item.recipeId === "porridge");
  return { database, manual, fromRecipe };
}

test("F03: checking a recipe's Rice ticks that row, not a manual Rice with the same name", async () => {
  const server = fakeServer();
  const { database, manual, fromRecipe } = await twoRice(server);

  assert.equal(fromRecipe.checked, true);
  assert.equal(manual.checked, false);
  assert.deepEqual(await outbox(database.db), []);
});

test("F03: the batch sends an id for each line it shows", async () => {
  const server = fakeServer();
  const database = await openTestDatabase();
  const items = await addJollof(database);
  const sent = [];
  const recording = {
    ...server,
    api: {
      ...server.api,
      async addRecipesToShoppingList(listId, body) {
        sent.push(body.lines);
        return server.api.addRecipesToShoppingList(listId, body);
      },
    },
  };
  await replay(database, recording);

  assert.deepEqual(sent, [
    items.map((item) => ({ clientLineId: item.id, recipeId: "jollof", recipeIngredientId: item.recipeIngredientId })),
  ]);
});

test("F03: with a server that can't say where a line went, a same-name match is never guessed; the check waits for review", async () => {
  const server = fakeServer({ lineItems: false });
  const { database, manual, fromRecipe } = await twoRice(server);

  assert.equal(manual.checked, false);
  assert.equal(fromRecipe.checked, false);
  assert.deepEqual(await outbox(database.db), [
    { kind: "shopping_list_item_toggle", depends_on: (await outbox(database.db))[0].depends_on, needs_attention: 1 },
  ]);
  const { listUnsavedChanges } = await import("../src/lib/sync/outboxRepair.ts");
  assert.equal((await listUnsavedChanges(database.db)).length, 1);
});

test("F03: with a server that can't say where a line went, a catalogue ingredient on exactly one row is still matched", async () => {
  const server = fakeServer({ lineItems: false });
  const database = await openTestDatabase();
  const items = await addJollof(database);
  await commandsFor(database).setChecked({ listId: LIST, itemId: items[0].id, checked: true });
  await replay(database, server);

  assert.equal(server.live().find((item) => item.ingredientId === "ing-rice").checked, true);
  assert.deepEqual(await outbox(database.db), []);
});
