import assert from "node:assert/strict";
import { test } from "node:test";
import { createListCommands, runListCommand } from "../src/lib/shopping/listCommands.ts";
import { createShoppingCommands } from "../src/lib/shopping/shoppingCommands.ts";
import { runShoppingCommand } from "../src/lib/shopping/shoppingReplay.ts";
import { replaceListsKeepingPendingEdits } from "../src/db/shoppingListRows.ts";
import { replayOutbox } from "../src/lib/sync/outboxReplay.ts";
import { openTestDatabase, testDatabasePath } from "./helpers/sqlite.mjs";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

// Lists and their items, like the server: the same clientMutationId again
// returns the list already made; ids that aren't its own are refused.
function fakeServer({ refuseDelete = null } = {}) {
  const lists = new Map();
  const items = new Map();
  const calls = [];
  let next = 1;
  const uuid = () => `00000000-0000-4000-8000-${String(next++).padStart(12, "0")}`;
  let loseNextReply = false;
  const own = (listId) => {
    if (!UUID.test(listId) || !lists.has(listId)) throw Object.assign(new Error("Not found"), { status: 404 });
    return lists.get(listId);
  };
  return {
    lists,
    items,
    calls,
    loseNextReply: () => (loseNextReply = true),
    api: {
      async createShoppingList({ name, clientMutationId }) {
        calls.push(["create", name]);
        let list = [...lists.values()].find((existing) => existing.clientMutationId === clientMutationId);
        if (!list) {
          list = { id: uuid(), name, clientMutationId, isActive: false, createdAt: "2026-10-14", updatedAt: "2026-10-14" };
          lists.set(list.id, list);
        }
        if (loseNextReply) {
          loseNextReply = false;
          throw Object.assign(new Error("timeout"), { status: 0 });
        }
        return { ...list, items: [] };
      },
      async updateShoppingListById(listId, { name }) {
        calls.push(["rename", listId]);
        own(listId).name = name;
        return { ...lists.get(listId), items: [] };
      },
      async deleteShoppingListById(listId) {
        calls.push(["delete", listId]);
        if (refuseDelete) throw Object.assign(new Error("Refused"), { status: refuseDelete });
        own(listId);
        lists.delete(listId);
      },
      async addShoppingListItemToList(listId, payload) {
        calls.push(["add item", listId]);
        own(listId);
        const id = uuid();
        items.set(id, { ...payload, id, shoppingListId: listId, checked: false });
        return { ...items.get(id) };
      },
    },
  };
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

let idCounter = 0;
const deps = ({ db, transact }) => ({
  db,
  transact,
  now: () => "2026-10-14T12:00:00.000Z",
  newId: (prefix) => `${prefix}_${++idCounter}`,
  requestSync: () => undefined,
});

let clock = 0;
function replay({ db, transact }, server, online = true) {
  clock += 60 * 60_000;
  return replayOutbox(
    db,
    async (database, operation) =>
      (await runListCommand(database, operation, { api: server.api, transact, now: () => clock })) ||
      runShoppingCommand(database, operation, { api: server.api, toLocalItem, transact, now: () => clock }),
    { isOnline: () => online, isStopped: () => false, now: () => clock }
  );
}

const lists = (db) => db.getAllAsync("SELECT id, name FROM shopping_lists WHERE is_default_synced_list = 0 ORDER BY name");
const items = (db) => db.getAllAsync("SELECT name, list_id FROM shopping_list_items ORDER BY name");
const outbox = (db) => db.getAllAsync("SELECT kind, needs_attention FROM sync_queue ORDER BY created_at, rowid");

test("QAD-04: a list made offline shows at once, and is saved with its command", async () => {
  const database = await openTestDatabase();
  const list = await createListCommands(deps(database)).createList({ name: "Party" });

  assert.deepEqual(await lists(database.db), [{ id: list.id, name: "Party" }]);
  assert.deepEqual(await outbox(database.db), [{ kind: "shopping_list_create", needs_attention: 0 }]);
});

test("QAD-04: killed while making a list, the phone keeps the list and its command, or neither", async () => {
  const path = testDatabasePath();
  const crashing = await openTestDatabase(path, { crashAfterWrites: 1 });
  await assert.rejects(createListCommands(deps(crashing)).createList({ name: "Party" }));
  crashing.db.close();

  const restarted = await openTestDatabase(path);
  assert.deepEqual(await lists(restarted.db), []);
  assert.deepEqual(await outbox(restarted.db), []);
});

test("QAD-04: items added to a list made offline reach that list once it exists on the server", async () => {
  const database = await openTestDatabase();
  const server = fakeServer();
  const list = await createListCommands(deps(database)).createList({ name: "Party" });
  await createShoppingCommands(deps(database)).addItem({ listId: list.id, name: "Rice", quantity: "1" });

  await replay(database, server);

  const [serverList] = server.lists.values();
  assert.equal(serverList.name, "Party");
  assert.deepEqual([...server.items.values()].map((item) => [item.name, item.shoppingListId]), [["Rice", serverList.id]]);
  assert.deepEqual(await lists(database.db), [{ id: serverList.id, name: "Party" }]);
  assert.deepEqual(await items(database.db), [{ name: "Rice", list_id: serverList.id }]);
  assert.deepEqual(await outbox(database.db), []);
});

test("QAD-04: a list whose reply was lost is made once", async () => {
  const database = await openTestDatabase();
  const server = fakeServer();
  await createListCommands(deps(database)).createList({ name: "Party" });

  server.loseNextReply();
  await replay(database, server);
  await replay(database, server);

  assert.equal(server.lists.size, 1);
  assert.deepEqual(await outbox(database.db), []);
});

test("QAD-04: renaming a list made offline waits for it, then renames it on the server", async () => {
  const database = await openTestDatabase();
  const server = fakeServer();
  const commands = createListCommands(deps(database));
  const list = await commands.createList({ name: "Party" });
  await commands.renameList({ listId: list.id, name: "Birthday" });

  assert.deepEqual((await lists(database.db)).map((row) => row.name), ["Birthday"]);
  await replay(database, server);
  assert.deepEqual([...server.lists.values()].map((row) => row.name), ["Birthday"]);
  assert.deepEqual(await outbox(database.db), []);
});

async function savedList(server) {
  const database = await openTestDatabase();
  const list = await createListCommands(deps(database)).createList({ name: "Party" });
  await createShoppingCommands(deps(database)).addItem({ listId: list.id, name: "Rice", quantity: "1" });
  await replay(database, server);
  const [{ id }] = await lists(database.db);
  return { database, id };
}

test("QAD-04: deleting a list hides it and its items at once, then deletes it on the server", async () => {
  const server = fakeServer();
  const { database, id } = await savedList(server);

  await createListCommands(deps(database)).deleteList({ listId: id });
  assert.deepEqual(await lists(database.db), []);
  assert.deepEqual(await items(database.db), []);

  await replay(database, server);
  assert.equal(server.lists.size, 0);
  assert.deepEqual(await outbox(database.db), []);
});

test("QAD-04: a list the server already deleted counts as deleted", async () => {
  const server = fakeServer();
  const { database, id } = await savedList(server);
  server.lists.clear();

  await createListCommands(deps(database)).deleteList({ listId: id });
  await replay(database, server);
  assert.deepEqual(await outbox(database.db), []);
  assert.deepEqual(await lists(database.db), []);
});

test("QAD-04: a delete the server refuses brings the list and its items back", async () => {
  const server = fakeServer({ refuseDelete: 403 });
  const { database, id } = await savedList(server);

  await createListCommands(deps(database)).deleteList({ listId: id });
  await replay(database, server);

  assert.deepEqual(await lists(database.db), [{ id, name: "Party" }]);
  assert.deepEqual(await items(database.db), [{ name: "Rice", list_id: id }]);
  assert.deepEqual(await outbox(database.db), []);
});

test("QAD-01: a lists reply older than list edits keeps them", async () => {
  const server = fakeServer();
  const { database, id } = await savedList(server);
  const commands = createListCommands(deps(database));
  const party = await commands.createList({ name: "Weekend" });
  await commands.renameList({ listId: id, name: "Birthday" });

  // Asked for before any of these edits.
  const reply = [{ id, name: "Party", isDefaultSyncedList: false, createdAt: "2026-10-14", updatedAt: "2026-10-14" }];
  const shown = await database.transact((tx) => replaceListsKeepingPendingEdits(tx, reply));

  assert.deepEqual(shown.filter((list) => !list.isDefaultSyncedList).map((list) => list.name).sort(), ["Birthday", "Weekend"]);
  assert.deepEqual((await lists(database.db)).map((row) => row.name), ["Birthday", "Weekend"]);
  assert.ok((await lists(database.db)).some((row) => row.id === party.id));
});

test("QAD-01: a lists reply keeps a list being deleted hidden", async () => {
  const server = fakeServer();
  const { database, id } = await savedList(server);
  await createListCommands(deps(database)).deleteList({ listId: id });

  const reply = [{ id, name: "Party", isDefaultSyncedList: false, createdAt: "2026-10-14", updatedAt: "2026-10-14" }];
  await database.transact((tx) => replaceListsKeepingPendingEdits(tx, reply));
  assert.deepEqual(await lists(database.db), []);
});
