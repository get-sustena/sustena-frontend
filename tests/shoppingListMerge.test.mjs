import assert from "node:assert/strict";
import { test } from "node:test";
import { replaceListItemsKeepingPendingEdits } from "../src/db/shoppingItemRows.ts";
import { saveSyncIdMapping } from "../src/db/syncIdMappingRepository.ts";
import { enqueueSyncOperation } from "../src/db/syncQueueRepository.ts";
import { createShoppingCommands } from "../src/lib/shopping/shoppingCommands.ts";
import { openTestDatabase, testDatabasePath } from "./helpers/sqlite.mjs";

const LIST = "list-1";
const OTHER_LIST = "list-2";

let idCounter = 0;
const commandsFor = ({ db, transact }) =>
  createShoppingCommands({
    db,
    transact,
    now: () => "2026-10-14T12:00:00.000Z",
    newId: (prefix) => `${prefix}_${++idCounter}`,
    requestSync: () => undefined,
  });

const serverItem = (id, name, checked = false, listId = LIST) => ({
  id,
  name,
  emoji: "🛒",
  quantity: "1",
  category: "Pantry",
  estimatedPrice: null,
  priceStatus: "unknown",
  checked,
  createdAt: `2026-10-14T00:00:0${id.slice(-1)}.000Z`,
  updatedAt: "2026-10-14T00:00:00.000Z",
  listId,
});

const rows = (db, listId = LIST) =>
  db.getAllAsync("SELECT id, name, checked FROM shopping_list_items WHERE list_id = ? ORDER BY name", [listId]);

// The list on the server before any edit: rice, beans and oil, none checked.
const SNAPSHOT = [serverItem("srv-1", "Rice"), serverItem("srv-2", "Beans"), serverItem("srv-3", "Oil")];

async function openSyncedList(path) {
  const database = await openTestDatabase(path);
  await database.transact((tx) => replaceListItemsKeepingPendingEdits(tx, LIST, SNAPSHOT));
  return database;
}

// The user's edits while a reply fetched earlier is still on its way:
// add pepper, check rice, check beans and oil with select all, remove oil.
async function editOffline(database) {
  const commands = commandsFor(database);
  const pepper = await commands.addItem({ listId: LIST, name: "Pepper", quantity: "1" });
  await commands.setChecked({ listId: LIST, itemId: "srv-1", checked: true });
  await commands.setManyChecked({ listId: LIST, itemIds: ["srv-2", "srv-3"], checked: true });
  await database.transact(async (tx) => {
    await tx.runAsync("DELETE FROM shopping_list_items WHERE id = ?", ["srv-3"]);
    await enqueueSyncOperation(tx, "shopping_list_item_remove", { listId: LIST, itemId: "srv-3" });
  });
  return pepper;
}

const EDITED = (pepperId) => [
  { id: "srv-2", name: "Beans", checked: 1 },
  { id: pepperId, name: "Pepper", checked: 0 },
  { id: "srv-1", name: "Rice", checked: 1 },
];

test("QAD-01: a reply fetched before an edit, arriving after it, keeps the edit in view and in SQLite", async () => {
  const database = await openSyncedList();
  const pepper = await editOffline(database);

  const shown = await database.transact((tx) => replaceListItemsKeepingPendingEdits(tx, LIST, SNAPSHOT));

  assert.deepEqual(await rows(database.db), EDITED(pepper.id));
  assert.deepEqual(
    shown.map(({ id, checked }) => [id, checked]).sort(),
    [["srv-1", true], ["srv-2", true], [pepper.id, false]].sort()
  );
});

test("QAD-01: after a late reply, the edit is still there when the app restarts", async () => {
  const path = testDatabasePath();
  const first = await openSyncedList(path);
  const pepper = await editOffline(first);
  await first.transact((tx) => replaceListItemsKeepingPendingEdits(tx, LIST, SNAPSHOT));
  first.db.close();

  const restarted = await openTestDatabase(path);
  assert.deepEqual(await rows(restarted.db), EDITED(pepper.id));
  // Startup's own reply, also from before the edits reached the server.
  await restarted.transact((tx) => replaceListItemsKeepingPendingEdits(tx, LIST, SNAPSHOT));
  assert.deepEqual(await rows(restarted.db), EDITED(pepper.id));
});

test("QAD-01: a check on an item created offline is kept after its creation reaches the server", async () => {
  const database = await openSyncedList();
  const commands = commandsFor(database);
  const pepper = await commands.addItem({ listId: LIST, name: "Pepper", quantity: "1" });
  await commands.setChecked({ listId: LIST, itemId: pepper.id, checked: true });

  // The creation was sent and its id swapped in; the check is still queued.
  await database.transact(async (tx) => {
    await tx.runAsync("DELETE FROM sync_queue WHERE kind = 'shopping_list_item_add'");
    await saveSyncIdMapping(tx, pepper.id, "srv-4", "shopping_list_item");
    await tx.runAsync("UPDATE shopping_list_items SET id = 'srv-4' WHERE id = ?", [pepper.id]);
  });
  const reply = [...SNAPSHOT, serverItem("srv-4", "Pepper")];
  await database.transact((tx) => replaceListItemsKeepingPendingEdits(tx, LIST, reply));

  assert.deepEqual((await rows(database.db)).find((row) => row.name === "Pepper"), { id: "srv-4", name: "Pepper", checked: 1 });
});

test("QAD-01: with nothing pending, the server's list replaces the device's", async () => {
  const database = await openSyncedList();
  await database.transact((tx) => tx.runAsync("UPDATE shopping_list_items SET checked = 1 WHERE id = 'srv-1'"));

  const reply = [serverItem("srv-1", "Rice"), serverItem("srv-5", "Salt")];
  await database.transact((tx) => replaceListItemsKeepingPendingEdits(tx, LIST, reply));

  assert.deepEqual(await rows(database.db), [
    { id: "srv-1", name: "Rice", checked: 0 },
    { id: "srv-5", name: "Salt", checked: 0 },
  ]);
});

test("QAD-01: edits waiting for another list don't change this one", async () => {
  const database = await openSyncedList();
  await commandsFor(database).addItem({ listId: OTHER_LIST, name: "Yam", quantity: "1" });
  await commandsFor(database).setChecked({ listId: OTHER_LIST, itemId: "srv-1", checked: true });

  await database.transact((tx) => replaceListItemsKeepingPendingEdits(tx, LIST, SNAPSHOT));

  assert.deepEqual(await rows(database.db), [
    { id: "srv-2", name: "Beans", checked: 0 },
    { id: "srv-3", name: "Oil", checked: 0 },
    { id: "srv-1", name: "Rice", checked: 0 },
  ]);
  assert.deepEqual((await rows(database.db, OTHER_LIST)).map((row) => row.name), ["Yam"]);
});

// SOL-01: an item created offline and checked; its creation reaches the
// server, its check times out; then an empty reply asked for before any of
// it arrives.
async function staleSnapshotRepro({ passRequestedAt }) {
  const { runShoppingCommand } = await import("../src/lib/shopping/shoppingReplay.ts");
  const { replayOutbox } = await import("../src/lib/sync/outboxReplay.ts");
  const database = await openTestDatabase();
  const serverItems = new Map();
  let checkTimesOut = true;
  const api = {
    async addShoppingListItemToList(listId, payload) {
      const id = "00000000-0000-4000-8000-000000000001";
      serverItems.set(id, { ...payload, id, shoppingListId: listId, checked: false });
      return { ...serverItems.get(id) };
    },
    async updateShoppingListItemInList(listId, itemId, { checked }) {
      if (checkTimesOut) throw Object.assign(new Error("timeout"), { status: 408 });
      serverItems.get(itemId).checked = checked;
    },
  };
  const toLocalItem = (item) => serverItem(item.id, item.name, item.checked, item.shoppingListId);
  let clock = 1_000;
  const replay = () =>
    replayOutbox(
      database.db,
      (db, operation) => runShoppingCommand(db, operation, { api, toLocalItem, transact: database.transact, now: () => clock }),
      { isOnline: () => true, isStopped: () => false, now: () => clock, ignoreBackoff: true }
    );

  const requestedAt = clock; // the empty list is asked for, and its reply is slow
  clock += 10;
  const commands = commandsFor(database);
  const rice = await commands.addItem({ listId: LIST, name: "Rice", quantity: "1" });
  await commands.setChecked({ listId: LIST, itemId: rice.id, checked: true });
  clock += 10;
  await replay(); // creation accepted; the check times out
  clock += 10;

  await database.transact((tx) =>
    replaceListItemsKeepingPendingEdits(tx, LIST, [], passRequestedAt ? { requestedAt } : {})
  );
  const afterReply = await rows(database.db);

  checkTimesOut = false;
  await replay();
  return { afterReply, serverItems, outbox: await database.db.getAllAsync("SELECT kind FROM sync_queue") };
}

test("QAD-01: a stale empty reply keeps an item whose check is still waiting, after its creation was accepted", async () => {
  const { afterReply, serverItems, outbox } = await staleSnapshotRepro({ passRequestedAt: false });
  const [serverRice] = serverItems.values();
  assert.deepEqual(afterReply, [{ id: serverRice.id, name: "Rice", checked: 1 }]);
  assert.equal(serverRice.checked, true);
  assert.deepEqual(outbox, []);
});

test("QAD-01: a reply asked for before the server accepted an edit to the list is ignored", async () => {
  const { afterReply, serverItems } = await staleSnapshotRepro({ passRequestedAt: true });
  const [serverRice] = serverItems.values();
  assert.deepEqual(afterReply, [{ id: serverRice.id, name: "Rice", checked: 1 }]);
});

test("QAD-01: a reply asked for after the last accepted edit is saved", async () => {
  const database = await openSyncedList();
  const { markListEditAcknowledged } = await import("../src/db/shoppingItemRows.ts");
  await database.transact((tx) => markListEditAcknowledged(tx, LIST, 1_000));

  await database.transact((tx) =>
    replaceListItemsKeepingPendingEdits(tx, LIST, [serverItem("srv-1", "Rice")], { requestedAt: 2_000 })
  );
  assert.deepEqual(await rows(database.db), [{ id: "srv-1", name: "Rice", checked: 0 }]);
});
