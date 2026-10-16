import assert from "node:assert/strict";
import { test } from "node:test";
import { createRatingCommands, pendingRatings, runRatingCommand } from "../src/lib/ratings/ratingCommands.ts";
import { replayOutbox } from "../src/lib/sync/outboxReplay.ts";
import { dropRefusedSocialChanges } from "../src/lib/sync/socialChanges.ts";
import { createFavoriteCommands } from "../src/lib/favorites/favoriteCommands.ts";
import { openTestDatabase } from "./helpers/sqlite.mjs";

let idCounter = 0;
const newId = (prefix) => `${prefix}_${++idCounter}`;
const clock = { now: 0 };
function replay(db, run) {
  clock.now += 60 * 60_000;
  return replayOutbox(db, (database, operation) => run(operation), {
    isOnline: () => true,
    isStopped: () => false,
    now: () => clock.now,
  });
}

test("rating offline: the newest stars show at once, and reach the server", async () => {
  const { db } = await openTestDatabase();
  const ratings = createRatingCommands({ db, newId, requestSync: () => undefined });
  await ratings.rate("sustena_pap-ogi", 3);
  await ratings.rate("sustena_pap-ogi", 5);
  assert.equal((await pendingRatings(db)).get("sustena_pap-ogi"), 5);

  const sent = [];
  await replay(db, (operation) =>
    runRatingCommand(operation, { rateRecipe: async (recipeId, rating) => sent.push([recipeId, rating]) })
  );
  assert.deepEqual(sent.at(-1), ["sustena_pap-ogi", 5]);
  assert.equal((await pendingRatings(db)).size, 0);
});

test("a save the server refuses is undone on the phone and handed back for Try again", async () => {
  const database = await openTestDatabase();
  const { db, transact } = database;
  await createFavoriteCommands({ db, transact, now: () => "2026-10-16T12:00:00.000Z", newId, requestSync: () => undefined })
    .setFavorite("sustena_pap-ogi", true);
  await replay(db, async () => {
    throw Object.assign(new Error("Refused"), { status: 403 });
  });

  const refused = await transact(dropRefusedSocialChanges);
  assert.deepEqual(refused, [{ kind: "favorite_add", recipeId: "sustena_pap-ogi" }]);
  assert.deepEqual(await db.getAllAsync("SELECT recipe_id FROM favorite_recipes"), []);
  assert.deepEqual(await db.getAllAsync("SELECT id FROM sync_queue"), []);
});
