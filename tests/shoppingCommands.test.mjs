import assert from "node:assert/strict";
import { test } from "node:test";
import { createShoppingCommands } from "../src/lib/shopping/shoppingCommands.ts";
import { runShoppingCommand } from "../src/lib/shopping/shoppingReplay.ts";
import { replayOutbox } from "../src/lib/sync/outboxReplay.ts";
import { openTestDatabase, testDatabasePath } from "./helpers/sqlite.mjs";

const LIST = "list-1";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

// A server that, like the real one, returns the existing item when the same
// clientMutationId arrives again, and refuses ids that aren't its own.
function fakeServer() {
  const items = new Map();
  let next = 1;
  let failNext = [];
  const calls = [];
  const maybeFail = (when) => {
    const failure = failNext[0];
    if (failure && failure.when === when) {
      failNext.shift();
      throw Object.assign(new Error(`status ${failure.status}`), { status: failure.status });
    }
  };
  return {
    items,
    calls,
    // { when: "before" | "after", status } — "after" means the server did
    // the work but the reply never arrived.
    failOnce(...failures) {
      failNext.push(...failures);
    },
    api: {
      async addShoppingListItemToList(listId, payload) {
        calls.push(["add", payload.clientMutationId]);
        maybeFail("before");
        let item = [...items.values()].find((existing) => existing.clientMutationId === payload.clientMutationId);
        if (!item) {
          const id = `00000000-0000-4000-8000-${String(next++).padStart(12, "0")}`;
          item = { ...payload, id, shoppingListId: listId, checked: false };
          items.set(id, item);
        }
        maybeFail("after");
        return { ...item };
      },
      async updateShoppingListItemInList(listId, itemId, { checked }) {
        calls.push(["check", itemId]);
        maybeFail("before");
        if (!UUID.test(itemId)) throw Object.assign(new Error("Not a valid id"), { status: 422 });
        items.get(itemId).checked = checked;
        maybeFail("after");
        return { ...items.get(itemId) };
      },
      async setShoppingListItemsChecked(listId, itemIds, checked) {
        calls.push(["check many", ...itemIds]);
        maybeFail("before");
        if (!itemIds.every((itemId) => UUID.test(itemId))) {
          throw Object.assign(new Error("Not a valid id"), { status: 422 });
        }
        for (const itemId of itemIds) items.get(itemId).checked = checked;
        maybeFail("after");
        return { id: listId, items: [...items.values()] };
      },
    },
  };
}

const toLocalItem = (item) => ({
  id: item.id,
  name: item.name,
  emoji: "🛒",
  quantity: item.displayQuantity ?? "1",
  displayQuantity: item.displayQuantity,
  category: item.category ?? "Pantry",
  estimatedPrice: null,
  priceStatus: "unknown",
  checked: item.checked,
  clientMutationId: item.clientMutationId,
  createdAt: "2026-10-14T00:00:00.000Z",
  updatedAt: "2026-10-14T00:00:00.000Z",
  listId: item.shoppingListId,
});

let idCounter = 0;
function commandsFor({ db, transact }) {
  return createShoppingCommands({
    db,
    transact,
    now: () => "2026-10-14T12:00:00.000Z",
    newId: (prefix) => `${prefix}_${++idCounter}`,
    requestSync: () => undefined,
  });
}

// One clock for the whole file, an hour on per replay, so backoffs pass.
const clock = { now: 0 };
function replay({ db, transact }, server) {
  clock.now += 60 * 60_000;
  return replayOutbox(
    db,
    (database, operation) => runShoppingCommand(database, operation, { api: server.api, toLocalItem, transact, now: () => clock.now }),
    { isOnline: () => true, isStopped: () => false, now: () => clock.now }
  );
}

const outbox = (db) =>
  db.getAllAsync("SELECT kind, mutation_id, entity_id, depends_on, command_version, needs_attention FROM sync_queue ORDER BY created_at, rowid");
const itemRows = (db) => db.getAllAsync("SELECT id, checked FROM shopping_list_items WHERE list_id = ? ORDER BY rowid", [LIST]);

test("QAD-02: adding an item saves it and its outbox command together, before any request", async () => {
  const database = await openTestDatabase();
  const server = fakeServer();
  const item = await commandsFor(database).addItem({ listId: LIST, name: "Rice", quantity: "2 kg" });

  assert.deepEqual(await itemRows(database.db), [{ id: item.id, checked: 0 }]);
  assert.deepEqual(await outbox(database.db), [
    {
      kind: "shopping_list_item_add",
      mutation_id: item.clientMutationId,
      entity_id: item.id,
      depends_on: null,
      command_version: 1,
      needs_attention: 0,
    },
  ]);
  assert.deepEqual(server.calls, []);
});

test("QAD-02: killed at each step of adding an item, the app keeps both the item and its command, or neither", async () => {
  // The add writes 2 rows: the item, then its command.
  for (const crashAfterWrites of [0, 1]) {
    const path = testDatabasePath();
    const crashing = await openTestDatabase(path, { crashAfterWrites });
    await assert.rejects(commandsFor(crashing).addItem({ listId: LIST, name: "Rice", quantity: "1" }));
    crashing.db.close();

    const restarted = await openTestDatabase(path);
    assert.deepEqual(await itemRows(restarted.db), [], `crash after ${crashAfterWrites} writes: no item`);
    assert.deepEqual(await outbox(restarted.db), [], `crash after ${crashAfterWrites} writes: no command`);
    restarted.db.close();
  }
});

test("QAD-02: killed after adding offline, the edit survives a restart and reaches the server once", async () => {
  const path = testDatabasePath();
  const first = await openTestDatabase(path);
  const item = await commandsFor(first).addItem({ listId: LIST, name: "Rice", quantity: "1" });
  first.db.close();

  const restarted = await openTestDatabase(path);
  const server = fakeServer();
  await replay(restarted, server);

  assert.equal(server.items.size, 1);
  const [serverItem] = server.items.values();
  assert.equal(serverItem.clientMutationId, item.clientMutationId);
  assert.deepEqual(await itemRows(restarted.db), [{ id: serverItem.id, checked: 0 }]);
  assert.deepEqual(await outbox(restarted.db), []);
});

test("QAD-02: a lost reply is retried with the same mutation id and creates no duplicate", async () => {
  const database = await openTestDatabase();
  const server = fakeServer();
  await commandsFor(database).addItem({ listId: LIST, name: "Rice", quantity: "1" });

  server.failOnce({ when: "after", status: 0 });
  await replay(database, server);
  await replay(database, server);

  assert.equal(server.items.size, 1);
  assert.equal(server.calls.filter(([kind]) => kind === "add").length, 2);
  assert.equal(new Set(server.calls.map(([, id]) => id)).size, 1);
  assert.deepEqual(await outbox(database.db), []);
});

test("F03: an item checked before its creation succeeds ends up checked on the server", async () => {
  const database = await openTestDatabase();
  const server = fakeServer();
  const commands = commandsFor(database);
  const item = await commands.addItem({ listId: LIST, name: "Rice", quantity: "1" });
  await commands.setChecked({ listId: LIST, itemId: item.id, checked: true });

  const [, check] = await outbox(database.db);
  assert.equal(check.depends_on, item.id);

  server.failOnce({ when: "before", status: 0 });
  await replay(database, server);
  assert.deepEqual(server.calls, [["add", item.clientMutationId]]);
  assert.equal((await outbox(database.db)).length, 2);

  await replay(database, server);
  const [serverItem] = server.items.values();
  assert.equal(serverItem.checked, true);
  assert.deepEqual(await itemRows(database.db), [{ id: serverItem.id, checked: 1 }]);
  assert.deepEqual(await outbox(database.db), []);
});

test("F03: when an item's creation is refused, its later check is kept, not sent or discarded", async () => {
  const database = await openTestDatabase();
  const server = fakeServer();
  const commands = commandsFor(database);
  const item = await commands.addItem({ listId: LIST, name: "Rice", quantity: "1" });
  await commands.setChecked({ listId: LIST, itemId: item.id, checked: true });

  server.failOnce({ when: "before", status: 422 });
  await replay(database, server);
  await replay(database, server);

  const rows = await outbox(database.db);
  assert.deepEqual(rows.map((row) => [row.kind, row.needs_attention]), [
    ["shopping_list_item_add", 1],
    ["shopping_list_item_toggle", 0],
  ]);
  assert.deepEqual(server.calls.filter(([kind]) => kind === "check"), []);
});

test("checking an item that's already on the server needs nothing first", async () => {
  const database = await openTestDatabase();
  const server = fakeServer();
  const commands = commandsFor(database);
  const item = await commands.addItem({ listId: LIST, name: "Rice", quantity: "1" });
  await replay(database, server);
  const [{ id }] = await itemRows(database.db);

  await commands.setChecked({ listId: LIST, itemId: id, checked: true });
  const [check] = await outbox(database.db);
  assert.equal(check.depends_on, null);
  assert.equal(check.entity_id, id);

  await replay(database, server);
  assert.equal(server.items.get(id).checked, true);
  assert.notEqual(id, item.id);
});

test("select all: items on the server are checked in one request, items still being added after they're created", async () => {
  const database = await openTestDatabase();
  const server = fakeServer();
  const commands = commandsFor(database);
  await commands.addItem({ listId: LIST, name: "Rice", quantity: "1" });
  await commands.addItem({ listId: LIST, name: "Beans", quantity: "1" });
  await replay(database, server);
  const pending = await commands.addItem({ listId: LIST, name: "Oil", quantity: "1" });
  const ids = (await itemRows(database.db)).map((row) => row.id);

  await commands.setManyChecked({ listId: LIST, itemIds: ids, checked: true });
  assert.deepEqual((await itemRows(database.db)).map((row) => row.checked), [1, 1, 1]);

  server.calls.length = 0;
  await replay(database, server);
  const [first, second] = ids;
  assert.deepEqual(server.calls, [
    ["add", pending.clientMutationId],
    ["check many", first, second],
    ["check", [...server.items.keys()][2]],
  ]);
  assert.deepEqual([...server.items.values()].map((item) => item.checked), [true, true, true]);
  assert.deepEqual(await outbox(database.db), []);
});
