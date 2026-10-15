import assert from "node:assert/strict";
import { test } from "node:test";
import { handAddedQuantity } from "../src/lib/shopping/handAddedQuantity.ts";
import { createShoppingCommands } from "../src/lib/shopping/shoppingCommands.ts";
import { openTestDatabase } from "./helpers/sqlite.mjs";

test("SL-08: a catalogue ingredient gets its own shopping unit, quantity 1", () => {
  assert.deepEqual(handAddedQuantity({ shoppingUnit: "kg" }), { quantity: "1", unit: "kg", displayQuantity: "1 kg" });
  assert.deepEqual(handAddedQuantity({ shoppingUnit: "L" }), { quantity: "1", unit: "L", displayQuantity: "1 L" });
  assert.deepEqual(handAddedQuantity({ shoppingUnit: "tbsp" }), { quantity: "1", unit: "tbsp", displayQuantity: "1 tbsp" });
  assert.deepEqual(handAddedQuantity({ shoppingUnit: "cube" }), { quantity: "1", unit: "cube", displayQuantity: "1 cube" });
});

test("SL-08: a counted ingredient is sent with no unit and reads 1 piece, as the server shows it", () => {
  assert.deepEqual(handAddedQuantity({ shoppingUnit: null }), { quantity: "1", unit: null, displayQuantity: "1 piece" });
});

test("SL-08: custom items, and a catalogue saved before shopping units, keep 1 unit", () => {
  assert.deepEqual(handAddedQuantity(undefined), { quantity: "1 unit", unit: "unit", displayQuantity: "1 unit" });
  assert.deepEqual(handAddedQuantity({}), { quantity: "1 unit", unit: "unit", displayQuantity: "1 unit" });
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
const queued = async (db) =>
  JSON.parse((await db.getFirstAsync("SELECT payload_json FROM sync_queue WHERE kind = 'shopping_list_item_add'")).payload_json);

test("SL-08: rice added by hand shows 1 kg at once, offline, and sends quantity 1 with unit kg", async () => {
  const database = await openTestDatabase();
  const item = await commandsFor(database).addItem({
    listId: "list-1",
    name: "Rice",
    ingredientId: "rice",
    ...handAddedQuantity({ shoppingUnit: "kg" }),
  });

  assert.equal(item.displayQuantity, "1 kg");
  const payload = await queued(database.db);
  assert.equal(payload.quantity, "1");
  assert.equal(payload.unit, "kg");
});

test("SL-08: eggs added by hand show 1 piece and are sent without a unit", async () => {
  const database = await openTestDatabase();
  const item = await commandsFor(database).addItem({
    listId: "list-1",
    name: "Eggs",
    ingredientId: "egg",
    ...handAddedQuantity({ shoppingUnit: null }),
  });

  assert.equal(item.displayQuantity, "1 piece");
  const payload = await queued(database.db);
  assert.equal(payload.quantity, "1");
  assert.equal(payload.unit ?? null, null);
});
