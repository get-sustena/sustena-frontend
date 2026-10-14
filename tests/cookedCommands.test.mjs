import assert from "node:assert/strict";
import { test } from "node:test";
import { getCookedDay } from "../src/db/cookedRecipesRepository.ts";
import { createCookedCommands, runCookedCommand } from "../src/lib/cooked/cookedCommands.ts";
import { replayOutbox } from "../src/lib/sync/outboxReplay.ts";
import { openTestDatabase, testDatabasePath } from "./helpers/sqlite.mjs";

// 21:30 in Lagos on 14 October.
const TAP = new Date("2026-10-14T20:30:00.000Z");

let idCounter = 0;
const commandsFor = ({ db, transact }, at = TAP) =>
  createCookedCommands({
    db,
    transact,
    now: () => at,
    newId: (prefix) => `${prefix}_${++idCounter}`,
    requestSync: () => undefined,
  });

function fakeServer() {
  const cooks = [];
  return {
    cooks,
    api: {
      async markRecipeCooked(recipeId, source) {
        cooks.push({ recipeId, source });
        return { recipeId, counted: true };
      },
    },
  };
}

const clock = { now: 0 };
function replay(db, server, online = true) {
  clock.now += 60 * 60_000;
  return replayOutbox(db, (database, operation) => runCookedCommand(operation, server.api), {
    isOnline: () => online,
    isStopped: () => false,
    now: () => clock.now,
  });
}

const outbox = (db) => db.getAllAsync("SELECT kind, payload_json, entity_id, mutation_id FROM sync_queue");

test("cooked offline: the button shows Cooked today at once, and the tap waits in the outbox", async () => {
  const database = await openTestDatabase();
  await commandsFor(database).markCooked({ userId: "user-1", recipeId: "sustena_pap-ogi", source: "learn_mode" });

  assert.equal(await getCookedDay(database.db, "user-1", "sustena_pap-ogi"), "2026-10-14");
  const [command] = await outbox(database.db);
  assert.equal(command.kind, "recipe_cooked");
  assert.equal(command.entity_id, "sustena_pap-ogi");
  assert.ok(command.mutation_id);
  assert.deepEqual(JSON.parse(command.payload_json), {
    recipeId: "sustena_pap-ogi",
    source: "learn_mode",
    cookedAt: "2026-10-14T20:30:00.000Z",
  });
});

test("cooked offline: the tap reaches the server once, after a restart", async () => {
  const path = testDatabasePath();
  const first = await openTestDatabase(path);
  const server = fakeServer();
  await commandsFor(first).markCooked({ userId: "user-1", recipeId: "sustena_pap-ogi", source: "learn_mode" });
  await replay(first.db, server, false);
  first.db.close();

  const restarted = await openTestDatabase(path);
  await replay(restarted.db, server);
  await replay(restarted.db, server);
  assert.deepEqual(server.cooks, [{ recipeId: "sustena_pap-ogi", source: "learn_mode" }]);
  assert.deepEqual(await outbox(restarted.db), []);
});

test("cooked offline: a second tap the same Lagos day queues nothing more", async () => {
  const database = await openTestDatabase();
  const commands = commandsFor(database);
  await commands.markCooked({ userId: "user-1", recipeId: "sustena_pap-ogi" });
  await commands.markCooked({ userId: "user-1", recipeId: "sustena_pap-ogi" });

  assert.equal((await outbox(database.db)).length, 1);
});

test("cooked offline: the next Lagos day counts again", async () => {
  const database = await openTestDatabase();
  await commandsFor(database).markCooked({ userId: "user-1", recipeId: "sustena_pap-ogi" });
  // 00:30 in Lagos on 15 October.
  await commandsFor(database, new Date("2026-10-14T23:30:00.000Z")).markCooked({ userId: "user-1", recipeId: "sustena_pap-ogi" });

  assert.equal((await outbox(database.db)).length, 2);
  assert.equal(await getCookedDay(database.db, "user-1", "sustena_pap-ogi"), "2026-10-15");
});
