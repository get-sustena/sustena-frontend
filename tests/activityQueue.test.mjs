import assert from "node:assert/strict";
import { test } from "node:test";
import { createActivityQueue } from "../src/lib/activity/activityQueue.ts";
import { openTestDatabase } from "./helpers/sqlite.mjs";

const OPENED = { platform: "android", appVersion: "1.0.0" };
const HOME = { type: "screen_viewed", properties: { screen: "home" } };

async function setUp({ fail = null } = {}) {
  const { db } = await openTestDatabase();
  const clock = { now: Date.parse("2026-10-16T09:00:00.000Z") };
  const session = { userId: "user-a" };
  const batches = [];
  let ids = 0;
  const queue = createActivityQueue({
    db,
    now: () => new Date(clock.now),
    newId: () => `event-${++ids}`,
    currentUserId: async () => session.userId,
    canSend: () => true,
    send: async (events) => {
      if (fail) throw fail;
      batches.push(events);
    },
    isRefused: (error) => error.status === 422,
  });
  const queued = () => db.getAllAsync("SELECT client_event_id, user_id FROM activity_events ORDER BY rowid");
  return { queue, clock, session, batches, queued, setFail: (error) => (fail = error) };
}

test("signed out records nothing; each account's events go only with its own session", async () => {
  const { queue, session, batches, queued } = await setUp();
  session.userId = null;
  await queue.record(HOME);
  assert.equal((await queued()).length, 0);

  session.userId = "user-a";
  for (let index = 0; index < 51; index += 1) await queue.record(HOME);
  session.userId = "user-b";
  await queue.record(HOME);
  await queue.flush();

  assert.deepEqual(batches.map((batch) => batch.length), [1]);
  assert.deepEqual(await queued(), Array.from({ length: 51 }, (_, index) => ({ client_event_id: `event-${index + 1}`, user_id: "user-a" })));

  session.userId = "user-a";
  await queue.flush();
  assert.deepEqual(batches.map((batch) => batch.length), [1, 50, 1]);
  assert.equal((await queued()).length, 0);
});

test("a failed send is retried with the same ids; a refused batch is dropped", async () => {
  const { queue, batches, queued, setFail } = await setUp({ fail: new Error("offline") });
  await queue.record(HOME);
  await queue.flush();
  assert.equal((await queued()).length, 1);

  setFail(null);
  await queue.flush();
  assert.equal(batches[0][0].clientEventId, "event-1");
  assert.equal(batches[0][0].occurredAt, "2026-10-16T09:00:00.000Z");

  setFail(Object.assign(new Error("refused"), { status: 422 }));
  await queue.record(HOME);
  await queue.flush();
  assert.equal((await queued()).length, 0);
});

test("screens count once per app open; 30 minutes away starts a new open", async () => {
  const { queue, clock, batches } = await setUp();
  await queue.startOpen(OPENED);
  await queue.recordOncePerOpen(HOME);
  await queue.recordOncePerOpen(HOME);

  queue.wentToBackground();
  clock.now += 29 * 60_000;
  assert.equal(queue.cameToForeground(), false);
  queue.wentToBackground();
  clock.now += 30 * 60_000;
  assert.equal(queue.cameToForeground(), true);
  await queue.startOpen(OPENED);
  await queue.recordOncePerOpen(HOME);
  await queue.flush();

  assert.deepEqual(batches.flat().map((event) => event.type), ["app_opened", "screen_viewed", "app_opened", "screen_viewed"]);
});

test("stays under the server's 120 batches per 10 minutes", async () => {
  const { queue, clock, batches } = await setUp();
  for (let index = 0; index < 101; index += 1) {
    await queue.record(HOME);
    await queue.flush();
  }
  assert.equal(batches.length, 100);

  clock.now += 10 * 60_000;
  await queue.flush();
  assert.equal(batches.length, 101);
});
