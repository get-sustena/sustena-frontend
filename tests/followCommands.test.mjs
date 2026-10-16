import assert from "node:assert/strict";
import { test } from "node:test";
import { createFollowCommands, followState, pendingFollows, runFollowCommand } from "../src/lib/creators/followCommands.ts";
import { replayOutbox } from "../src/lib/sync/outboxReplay.ts";
import { openTestDatabase } from "./helpers/sqlite.mjs";

let idCounter = 0;
const commandsFor = (db) =>
  createFollowCommands({ db, newId: (prefix) => `${prefix}_${++idCounter}`, requestSync: () => undefined });

const clock = { now: 0 };
function replay(db, api) {
  clock.now += 60 * 60_000;
  return replayOutbox(db, (database, operation) => runFollowCommand(operation, api), {
    isOnline: () => true,
    isStopped: () => false,
    now: () => clock.now,
  });
}

const outbox = (db) => db.getAllAsync("SELECT kind FROM sync_queue");

test("follow offline: the last tap shows at once with the count, and every tap reaches the server in order", async () => {
  const { db } = await openTestDatabase();
  const follow = commandsFor(db);
  await follow.setFollowing("creator-ada", true, "Ada");
  await follow.setFollowing("creator-ada", false, "Ada");
  await follow.setFollowing("creator-ada", true, "Ada");

  const pending = await pendingFollows(db);
  assert.deepEqual(followState({ following: false, followerCount: 12 }, pending.get("creator-ada")), {
    following: true,
    followerCount: 13,
  });

  const sent = [];
  await replay(db, {
    saveCreator: async (id) => sent.push(["follow", id]),
    unsaveCreator: async (id) => sent.push(["unfollow", id]),
  });
  assert.deepEqual(sent, [["follow", "creator-ada"], ["unfollow", "creator-ada"], ["follow", "creator-ada"]]);
  assert.deepEqual(await outbox(db), []);
});

test("follow offline: following your own profile is dropped by the server and doesn't block the outbox", async () => {
  const { db } = await openTestDatabase();
  await commandsFor(db).setFollowing("creator-me", true, "Me");
  await replay(db, {
    saveCreator: async () => {
      throw Object.assign(new Error("Cannot save self"), { status: 422, code: "CANNOT_SAVE_SELF" });
    },
    unsaveCreator: async () => undefined,
  });
  assert.deepEqual(await outbox(db), []);
  assert.equal((await pendingFollows(db)).size, 0);
});
