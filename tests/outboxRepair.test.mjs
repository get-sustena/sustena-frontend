import assert from "node:assert/strict";
import { test } from "node:test";
import { createFavoriteCommands } from "../src/lib/favorites/favoriteCommands.ts";
import { createShoppingCommands } from "../src/lib/shopping/shoppingCommands.ts";
import { runShoppingCommand } from "../src/lib/shopping/shoppingReplay.ts";
import { discardChange, listUnsavedChanges, retryChange } from "../src/lib/sync/outboxRepair.ts";
import { replayOutbox } from "../src/lib/sync/outboxReplay.ts";
import { openTestDatabase } from "./helpers/sqlite.mjs";

const LIST = "list-1";

let idCounter = 0;
const deps = ({ db, transact }) => ({
  db,
  transact,
  now: () => "2026-10-14T12:00:00.000Z",
  newId: (prefix) => `${prefix}_${++idCounter}`,
  requestSync: () => undefined,
});

// A server that refuses new items until `accept` is set, as when a field
// fails its checks.
function fakeServer() {
  const items = new Map();
  const calls = [];
  const server = {
    accept: false,
    items,
    calls,
    api: {
      async addShoppingListItemToList(listId, payload) {
        calls.push("add");
        if (!server.accept) throw Object.assign(new Error("Name is too long"), { status: 422 });
        const id = "00000000-0000-4000-8000-000000000001";
        items.set(id, { ...payload, id, shoppingListId: listId, checked: false });
        return { ...items.get(id) };
      },
      async updateShoppingListItemInList(listId, itemId, { checked }) {
        calls.push("check");
        items.get(itemId).checked = checked;
      },
    },
  };
  return server;
}

const toLocalItem = (item) => ({
  id: item.id,
  name: item.name,
  emoji: "🛒",
  quantity: "1",
  category: "Pantry",
  estimatedPrice: null,
  checked: item.checked,
  createdAt: "2026-10-14T00:00:00.000Z",
  updatedAt: "2026-10-14T00:00:00.000Z",
  listId: item.shoppingListId,
});

let clock = 0;
const replay = ({ db, transact }, server) => {
  clock += 60 * 60_000;
  return replayOutbox(
    db,
    (database, operation) => runShoppingCommand(database, operation, { api: server.api, toLocalItem, transact, now: () => clock }),
    { isOnline: () => true, isStopped: () => false, now: () => clock }
  );
};

const rows = (db) => db.getAllAsync("SELECT name, checked FROM shopping_list_items WHERE list_id = ?", [LIST]);
const outbox = (db) => db.getAllAsync("SELECT kind, needs_attention FROM sync_queue ORDER BY created_at, rowid");

async function refusedAddWithCheck() {
  const database = await openTestDatabase();
  const server = fakeServer();
  const commands = createShoppingCommands(deps(database));
  const rice = await commands.addItem({ listId: LIST, name: "Rice", quantity: "1" });
  await commands.setChecked({ listId: LIST, itemId: rice.id, checked: true });
  await replay(database, server);
  return { database, server };
}

test("F02: a refused change and the change waiting on it are listed, in plain words", async () => {
  const { database } = await refusedAddWithCheck();

  const changes = await listUnsavedChanges(database.db);
  assert.deepEqual(
    changes.map(({ title, reason, waitingOn }) => ({ title, reason, waiting: Boolean(waitingOn) })),
    [
      { title: "Add Rice to your shopping list", reason: "Your account didn't accept this change.", waiting: false },
      { title: "Tick Rice", reason: null, waiting: true },
    ]
  );
});

test("F02: Retry sends the refused change again, and the change waiting on it follows", async () => {
  const { database, server } = await refusedAddWithCheck();
  const [refused] = await listUnsavedChanges(database.db);

  server.accept = true;
  await retryChange(database.db, refused.id);
  await replay(database, server);

  assert.deepEqual(await outbox(database.db), []);
  assert.deepEqual([...server.items.values()].map((item) => [item.name, item.checked]), [["Rice", true]]);
  assert.deepEqual(await listUnsavedChanges(database.db), []);
});

test("F02: a change still refused after Retry stays listed, and nothing waiting on it is sent", async () => {
  const { database, server } = await refusedAddWithCheck();
  const [refused] = await listUnsavedChanges(database.db);

  await retryChange(database.db, refused.id);
  await replay(database, server);

  assert.equal((await listUnsavedChanges(database.db)).length, 2);
  assert.deepEqual(server.calls, ["add", "add"]);
});

test("F02: Discard drops the refused change and what waits on it, and undoes them on the phone", async () => {
  const { database, server } = await refusedAddWithCheck();
  const [refused] = await listUnsavedChanges(database.db);

  await database.transact((tx) => discardChange(tx, refused.id));
  await replay(database, server);

  assert.deepEqual(await outbox(database.db), []);
  assert.deepEqual(await rows(database.db), []);
  assert.deepEqual(server.calls, ["add"]);
});

test("F02: discarding a refused save puts the recipe back to unsaved on the phone", async () => {
  const database = await openTestDatabase();
  await createFavoriteCommands(deps(database)).setFavorite("sustena_pap-ogi", true);
  await database.db.runAsync("UPDATE sync_queue SET needs_attention = 1, last_error = 'Recipe not found'");
  const [refused] = await listUnsavedChanges(database.db);
  assert.equal(refused.title, "Save a recipe");

  await database.transact((tx) => discardChange(tx, refused.id));
  assert.deepEqual(await database.db.getAllAsync("SELECT recipe_id FROM favorite_recipes"), []);
  assert.deepEqual(await outbox(database.db), []);
});

test("F02: changes that are only waiting for a connection aren't listed", async () => {
  const database = await openTestDatabase();
  await createShoppingCommands(deps(database)).addItem({ listId: LIST, name: "Rice", quantity: "1" });

  assert.deepEqual(await listUnsavedChanges(database.db), []);
});

test("F02: discarding a refused I cooked it puts the button back for that day", async () => {
  const { createCookedCommands } = await import("../src/lib/cooked/cookedCommands.ts");
  const { getCookedDay } = await import("../src/db/cookedRecipesRepository.ts");
  const database = await openTestDatabase();
  const at = new Date("2026-10-14T12:00:00.000Z");
  await createCookedCommands({ ...deps(database), now: () => at }).markCooked({ userId: "user-1", recipeId: "pap" });
  await database.db.runAsync("UPDATE sync_queue SET needs_attention = 1");
  const [refused] = await listUnsavedChanges(database.db);

  await database.transact((tx) => discardChange(tx, refused.id));
  assert.equal(await getCookedDay(database.db, "user-1", "pap"), null);
});
