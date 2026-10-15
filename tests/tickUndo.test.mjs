import assert from "node:assert/strict";
import { test } from "node:test";
import { createShoppingCommands } from "../src/lib/shopping/shoppingCommands.ts";
import { runShoppingCommand } from "../src/lib/shopping/shoppingReplay.ts";
import { markAllChange, tickMessage } from "../src/lib/shopping/tickChanges.ts";
import { replayOutbox } from "../src/lib/sync/outboxReplay.ts";
import { openTestDatabase } from "./helpers/sqlite.mjs";

const LIST = "list-1";

// Just enough of the server for adds and ticks.
function fakeServer() {
  const items = new Map();
  let next = 1;
  return {
    items,
    api: {
      async addShoppingListItemToList(listId, payload) {
        const id = `00000000-0000-4000-8000-${String(next++).padStart(12, "0")}`;
        const item = { ...payload, id, shoppingListId: listId, checked: false };
        items.set(id, item);
        return { ...item };
      },
      async updateShoppingListItemInList(listId, itemId, { checked }) {
        items.get(itemId).checked = checked;
        return { ...items.get(itemId) };
      },
      async setShoppingListItemsChecked(listId, itemIds, checked) {
        for (const itemId of itemIds) items.get(itemId).checked = checked;
        return { id: listId, items: [...items.values()] };
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
  priceStatus: "unknown",
  checked: item.checked,
  clientMutationId: item.clientMutationId,
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
function replay({ db, transact }, server, online = true) {
  clock += 60 * 60_000;
  return replayOutbox(
    db,
    (database, operation) => runShoppingCommand(database, operation, { api: server.api, toLocalItem, transact, now: () => clock }),
    { isOnline: () => online, isStopped: () => false, now: () => clock }
  );
}

const ticks = (db) => db.getAllAsync("SELECT name, checked FROM shopping_list_items WHERE list_id = ? ORDER BY name", [LIST]);
const serverTicks = (server) =>
  [...server.items.values()].map(({ name, checked }) => ({ name, checked: checked ? 1 : 0 })).sort((a, b) => a.name.localeCompare(b.name));

test("SL-05: one tick says which way it went", () => {
  assert.equal(tickMessage(true), "Marked as in pantry");
  assert.equal(tickMessage(false), "Marked as not in pantry");
});

test("SL-05: mark all ticks what's still needed, or unticks everything once all are ticked", () => {
  const someNeeded = markAllChange([
    { id: "a", checked: true },
    { id: "b", checked: false },
    { id: "c", checked: false },
  ]);
  assert.deepEqual(someNeeded, { checked: true, itemIds: ["b", "c"], message: "Marked all as in pantry" });

  const allTicked = markAllChange([
    { id: "a", checked: true },
    { id: "b", checked: true },
  ]);
  assert.deepEqual(allTicked, { checked: false, itemIds: ["a", "b"], message: "Marked all as not in pantry" });
});

test("SL-05: undoing mark all offline puts back exactly what was ticked, on the phone and then the server", async () => {
  const database = await openTestDatabase();
  const server = fakeServer();
  const commands = commandsFor(database);
  for (const name of ["Beans", "Rice", "Yam"]) await commands.addItem({ listId: LIST, name, quantity: "1" });
  await replay(database, server);
  const rice = (await database.db.getFirstAsync("SELECT id FROM shopping_list_items WHERE name = 'Rice'")).id;
  await commands.setChecked({ listId: LIST, itemId: rice, checked: true });
  await replay(database, server);
  const before = await ticks(database.db);

  // Offline: mark all, then Undo.
  const items = (await database.db.getAllAsync("SELECT id, checked FROM shopping_list_items WHERE list_id = ?", [LIST])).map(
    (row) => ({ id: row.id, checked: Boolean(row.checked) })
  );
  const change = markAllChange(items);
  await commands.setManyChecked({ listId: LIST, itemIds: change.itemIds, checked: change.checked });
  assert.ok((await ticks(database.db)).every((row) => row.checked === 1));
  await commands.setManyChecked({ listId: LIST, itemIds: change.itemIds, checked: !change.checked });
  await replay(database, server, false);

  assert.deepEqual(await ticks(database.db), before);
  await replay(database, server);
  assert.deepEqual(serverTicks(server), before);
});
