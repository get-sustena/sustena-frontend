import assert from "node:assert/strict";
import { test } from "node:test";
import { getStoredPlannerSettings, saveStoredPlannerSettings } from "../src/db/plannerSettingsRepository.ts";
import { createSettingsCommands, runSettingsCommand, withPendingSettings } from "../src/lib/settings/settingsCommands.ts";
import { replayOutbox } from "../src/lib/sync/outboxReplay.ts";
import { openTestDatabase, testDatabasePath } from "./helpers/sqlite.mjs";

let idCounter = 0;
const commandsFor = ({ db, transact }) =>
  createSettingsCommands({
    db,
    transact,
    newId: (prefix) => `${prefix}_${++idCounter}`,
    requestSync: () => undefined,
  });

const PLAN = { days: 7, mealSlots: ["breakfast", "dinner"], mealsPerDay: 2, budgetMode: "weekly" };

function fakeServer() {
  const received = { preferences: [], profileAnswers: [], plannerSettings: [] };
  let offline = false;
  const send = (key) => async (payload) => {
    if (offline) throw Object.assign(new Error("Network Error"), { status: 0 });
    received[key].push(payload);
    return payload;
  };
  return {
    received,
    goOffline: () => (offline = true),
    goOnline: () => (offline = false),
    api: {
      updatePreferences: send("preferences"),
      updateProfileAnswers: send("profileAnswers"),
      updatePlannerSettings: send("plannerSettings"),
    },
  };
}

let clock = 0;
const replay = (db, server) => {
  clock += 60 * 60_000;
  return replayOutbox(db, (database, operation) => runSettingsCommand(operation, server.api), {
    isOnline: () => true,
    isStopped: () => false,
    now: () => clock,
  });
};

const outbox = (db) => db.getAllAsync("SELECT kind, payload_json FROM sync_queue ORDER BY created_at, rowid");

test("QAD-01: a planner change is saved on the phone with its command, before any request", async () => {
  const database = await openTestDatabase();
  const server = fakeServer();
  await commandsFor(database).save("planner_settings_update", PLAN, (tx) => saveStoredPlannerSettings(tx, PLAN));

  assert.equal((await getStoredPlannerSettings(database.db))?.days, 7);
  assert.deepEqual((await outbox(database.db)).map((row) => row.kind), ["planner_settings_update"]);
  assert.deepEqual(server.received.plannerSettings, []);
});

test("QAD-01: killed while saving a planner change, the phone keeps both the change and its command, or neither", async () => {
  const path = testDatabasePath();
  const crashing = await openTestDatabase(path, { crashAfterWrites: 1 });
  await assert.rejects(
    commandsFor(crashing).save("planner_settings_update", PLAN, (tx) => saveStoredPlannerSettings(tx, PLAN))
  );
  crashing.db.close();

  const restarted = await openTestDatabase(path);
  assert.equal(await getStoredPlannerSettings(restarted.db), null);
  assert.deepEqual(await outbox(restarted.db), []);
});

test("QAD-04: a preferences change made offline reaches the server after a restart", async () => {
  const path = testDatabasePath();
  const first = await openTestDatabase(path);
  await commandsFor(first).save("preferences_update", { defaultServingSize: 6 }, async () => {});
  first.db.close();

  const restarted = await openTestDatabase(path);
  const server = fakeServer();
  await replay(restarted.db, server);
  assert.deepEqual(server.received.preferences, [{ defaultServingSize: 6 }]);
  assert.deepEqual(await outbox(restarted.db), []);
});

test("QAD-01: changes made before the first is sent go as one update with all of them", async () => {
  const database = await openTestDatabase();
  const commands = commandsFor(database);
  await commands.save("profile_answers_update", { experience: "beginner" }, async () => {});
  await commands.save("profile_answers_update", { habitWho: "family" }, async () => {});
  await commands.save("profile_answers_update", { experience: "intermediate" }, async () => {});

  const server = fakeServer();
  await replay(database.db, server);
  assert.deepEqual(server.received.profileAnswers, [{ experience: "intermediate", habitWho: "family" }]);
});

test("QAD-01: a reply older than a settings change keeps the change", async () => {
  const database = await openTestDatabase();
  await commandsFor(database).save("preferences_update", { defaultServingSize: 6 }, async () => {});

  const merged = await withPendingSettings(database.db, "preferences_update", {
    defaultServingSize: 2,
    defaultUnitMode: "metric",
  });
  assert.deepEqual(merged, { defaultServingSize: 6, defaultUnitMode: "metric" });
});

test("QAD-01: with nothing waiting, the server's settings are used as they are", async () => {
  const database = await openTestDatabase();
  const server = { defaultServingSize: 2, defaultUnitMode: "metric" };
  assert.deepEqual(await withPendingSettings(database.db, "preferences_update", server), server);
});
