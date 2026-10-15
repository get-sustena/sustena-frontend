import assert from "node:assert/strict";
import { test } from "node:test";
import { captureAccountTables, clearAccountTables, forgetAccount, restoreAccountTables } from "../src/db/accountSnapshots.ts";
import { createShoppingCommands } from "../src/lib/shopping/shoppingCommands.ts";
import { queueOldRecipeBatch } from "./helpers/oldRecipeBatch.mjs";
import { openTestDatabase } from "./helpers/sqlite.mjs";

let idCounter = 0;
const commandsFor = ({ db, transact }) =>
  createShoppingCommands({
    db,
    transact,
    now: () => "2026-10-14T12:00:00.000Z",
    newId: (prefix) => `${prefix}_${++idCounter}`,
    requestSync: () => undefined,
  });

const outbox = (db) =>
  db.getAllAsync(
    "SELECT kind, payload_json, mutation_id, entity_id, depends_on, needs_attention, last_error, command_version FROM sync_queue ORDER BY created_at, rowid"
  );
const items = (db) => db.getAllAsync("SELECT id, name, recipe_batch_id, checked FROM shopping_list_items ORDER BY name");

test("switching accounts and back keeps the outbox whole: mutation ids, waits and refusals", async () => {
  const database = await openTestDatabase();
  const commands = commandsFor(database);
  const rice = await commands.addItem({ listId: "list-1", name: "Rice", quantity: "1" });
  await commands.setChecked({ listId: "list-1", itemId: rice.id, checked: true });
  await queueOldRecipeBatch(database, {
    listId: "list-1",
    recipes: [{ recipeId: "jollof", servings: 2 }],
    items: [{ id: "line-1", name: "Tomatoes", emoji: "🛒", quantity: "1", category: "Pantry", estimatedPrice: null, checked: false, createdAt: "now", updatedAt: "now" }],
  });
  await database.db.runAsync("UPDATE sync_queue SET needs_attention = 1, last_error = 'Refused' WHERE kind = 'shopping_list_item_add'");
  const before = { outbox: await outbox(database.db), items: await items(database.db) };

  const snapshot = await database.transact((tx) => captureAccountTables(tx));
  await database.transact((tx) => clearAccountTables(tx));
  assert.deepEqual(await outbox(database.db), []);
  await database.transact((tx) => restoreAccountTables(tx, snapshot));

  assert.deepEqual(await outbox(database.db), before.outbox);
  assert.deepEqual(await items(database.db), before.items);
  assert.ok(before.outbox[1].depends_on, "the check still waits for its item");
});

test("a snapshot saved before the outbox had its newer columns restores with their defaults", async () => {
  const database = await openTestDatabase();
  // What an older app version saved.
  const oldSnapshot = {
    sync_queue: [{ id: "sync-1", kind: "favorite_add", payload_json: '{"recipeId":"pap"}', created_at: "then", attempts: 2 }],
    shopping_list_items: [
      { id: "item-1", name: "Rice", emoji: "🛒", quantity: "1", category: "Pantry", estimated_price: null, checked: 0, created_at: "then", updated_at: "then", list_id: "default" },
    ],
  };

  await database.transact((tx) => restoreAccountTables(tx, oldSnapshot));

  assert.deepEqual(await outbox(database.db), [
    {
      kind: "favorite_add",
      payload_json: '{"recipeId":"pap"}',
      mutation_id: null,
      entity_id: null,
      depends_on: null,
      needs_attention: 0,
      last_error: null,
      command_version: 1,
    },
  ]);
  const [item] = await database.db.getAllAsync("SELECT price_status FROM shopping_list_items");
  assert.equal(item.price_status, "unknown");
});

test("a deleted account leaves nothing on the phone: its tables and the copy kept for its return", async () => {
  const database = await openTestDatabase();
  await commandsFor(database).addItem({ listId: "list-1", name: "Rice", quantity: "1" });
  await database.db.runAsync(
    "INSERT INTO account_data_snapshots (user_id, snapshot_json, updated_at) VALUES ('deleted-user', '{}', 'now'), ('other-user', '{}', 'now')"
  );

  await database.transact((tx) => forgetAccount(tx, "deleted-user"));

  assert.deepEqual(await items(database.db), []);
  assert.deepEqual(await outbox(database.db), []);
  assert.deepEqual(await database.db.getAllAsync("SELECT user_id FROM account_data_snapshots"), [{ user_id: "other-user" }]);
});
