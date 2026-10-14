import assert from "node:assert/strict";
import { test } from "node:test";
import {
  getStoredFavorites,
  replaceFavoritesKeepingPendingEdits,
} from "../src/db/favoritesRepository.ts";
import { createFavoriteCommands, runFavoriteCommand, savedRecipeList } from "../src/lib/favorites/favoriteCommands.ts";
import { replayOutbox } from "../src/lib/sync/outboxReplay.ts";
import { openTestDatabase, testDatabasePath } from "./helpers/sqlite.mjs";

let idCounter = 0;
const commandsFor = ({ db, transact }) =>
  createFavoriteCommands({
    db,
    transact,
    now: () => "2026-10-14T12:00:00.000Z",
    newId: (prefix) => `${prefix}_${++idCounter}`,
    requestSync: () => undefined,
  });

function fakeServer(initial = []) {
  const favorites = new Set(initial);
  const calls = [];
  let offline = false;
  return {
    favorites,
    calls,
    goOffline() {
      offline = true;
    },
    goOnline() {
      offline = false;
    },
    api: {
      async addFavorite(recipeId) {
        calls.push(["add", recipeId]);
        if (offline) throw Object.assign(new Error("Network Error"), { status: 0 });
        favorites.add(recipeId);
      },
      async removeFavorite(recipeId) {
        calls.push(["remove", recipeId]);
        if (offline) throw Object.assign(new Error("Network Error"), { status: 0 });
        favorites.delete(recipeId);
      },
    },
  };
}

const clock = { now: 0 };
function replay(db, server, online = true) {
  clock.now += 60 * 60_000;
  return replayOutbox(db, (database, operation) => runFavoriteCommand(operation, server.api), {
    isOnline: () => online,
    isStopped: () => false,
    now: () => clock.now,
  });
}

const savedIds = async (db) => (await getStoredFavorites(db)).map((row) => row.recipe_id).sort();
const outbox = (db) => db.getAllAsync("SELECT kind, entity_id FROM sync_queue ORDER BY created_at, rowid");

test("F04: saving a recipe stores it and its outbox command together, even when the page shows the phone's copy", async () => {
  const database = await openTestDatabase();
  await commandsFor(database).setFavorite("sustena_pap-ogi", true);

  assert.deepEqual(await savedIds(database.db), ["sustena_pap-ogi"]);
  assert.deepEqual(await outbox(database.db), [{ kind: "favorite_add", entity_id: "sustena_pap-ogi" }]);
});

test("F04: a recipe saved offline reaches the server after a restart", async () => {
  const path = testDatabasePath();
  const first = await openTestDatabase(path);
  const server = fakeServer();
  await commandsFor(first).setFavorite("sustena_pap-ogi", true);
  await replay(first.db, server, false);
  first.db.close();

  const restarted = await openTestDatabase(path);
  await replay(restarted.db, server);
  assert.deepEqual([...server.favorites], ["sustena_pap-ogi"]);
  assert.deepEqual(await outbox(restarted.db), []);
});

test("F04: unsaving then saving again ends saved on the server", async () => {
  const database = await openTestDatabase();
  const server = fakeServer(["sustena_pap-ogi"]);
  const commands = commandsFor(database);
  await commands.setFavorite("sustena_pap-ogi", false);
  await commands.setFavorite("sustena_pap-ogi", true);

  await replay(database.db, server);
  assert.deepEqual([...server.favorites], ["sustena_pap-ogi"]);
  assert.deepEqual(await savedIds(database.db), ["sustena_pap-ogi"]);
});

test("QAD-01: a favourites reply older than an edit keeps the edit", async () => {
  const database = await openTestDatabase();
  const commands = commandsFor(database);
  await commands.setFavorite("egusi", true);
  await commands.setFavorite("jollof", false);

  // Fetched before the edits reached the server.
  const kept = await database.transact((tx) => replaceFavoritesKeepingPendingEdits(tx, ["jollof", "pap"], "now"));

  assert.deepEqual(kept.sort(), ["egusi", "pap"]);
  assert.deepEqual(await savedIds(database.db), ["egusi", "pap"]);
});

test("QAD-01: with nothing pending, the server's favourites replace the phone's", async () => {
  const database = await openTestDatabase();
  await database.db.runAsync(
    "INSERT INTO favorite_recipes (recipe_id, created_at, updated_at) VALUES ('old', 'then', 'then')"
  );

  await database.transact((tx) => replaceFavoritesKeepingPendingEdits(tx, ["pap", "egusi"], "now"));
  assert.deepEqual(await savedIds(database.db), ["egusi", "pap"]);
});

test("F05: the Saved list drops a recipe as soon as it's unsaved, before the server knows", () => {
  const server = [{ id: "pap", name: "Pap (server)" }, { id: "egusi", name: "Egusi (server)" }];
  const local = [{ id: "pap", name: "Pap" }, { id: "egusi", name: "Egusi" }, { id: "jollof", name: "Jollof" }];

  // Pap was unsaved and jollof saved on the phone; the server's list is older.
  const membership = [{ recipeId: "jollof" }, { recipeId: "egusi" }];
  assert.deepEqual(
    savedRecipeList(membership, server, local).map((recipe) => recipe.name),
    ["Jollof", "Egusi (server)"]
  );
});

test("F05: offline, the Saved list uses the recipes kept on the phone", () => {
  const local = [{ id: "pap", name: "Pap" }];
  assert.deepEqual(savedRecipeList([{ recipeId: "pap" }, { recipeId: "missing" }], undefined, local), local);
});
