import assert from "node:assert/strict";
import { test } from "node:test";
import { replayQueue, retryDelayMs } from "../src/lib/sync/syncReplay.ts";

// An in-memory outbox standing in for the sync_queue table.
function memoryOutbox(operations, run) {
  const rows = new Map(
    operations.map((operation) => [
      operation.id,
      { attempts: 0, nextAttemptAt: null, needsAttention: false, ...operation },
    ])
  );
  const ran = [];
  return {
    rows,
    ran,
    store: {
      pending: async () => [...rows.values()],
      run: async (operation) => {
        ran.push(operation.id);
        await run(operation);
      },
      remove: async (id) => {
        rows.delete(id);
      },
      scheduleRetry: async (id, nextAttemptAt) => {
        const row = rows.get(id);
        row.attempts += 1;
        row.nextAttemptAt = nextAttemptAt;
      },
      markNeedsAttention: async (id, reason) => {
        const row = rows.get(id);
        row.needsAttention = true;
        row.reason = reason;
      },
    },
  };
}

const failWith = (status) => async () => {
  throw Object.assign(new Error(`status ${status}`), { status });
};
const online = { isOnline: () => true, isStopped: () => false };

test("F02: an edit survives more than eight status-0 failures", async () => {
  const outbox = memoryOutbox([{ id: "edit-1" }], failWith(0));
  let now = 0;

  for (let run = 0; run < 12; run += 1) {
    now += 60 * 60_000;
    await replayQueue(outbox.store, { ...online, now: () => now });
  }

  assert.equal(outbox.rows.size, 1);
  assert.equal(outbox.rows.get("edit-1").attempts, 12);
  assert.equal(outbox.rows.get("edit-1").needsAttention, false);
});

test("timeouts, rate limits and server errors are temporary too", async () => {
  for (const status of [408, 429, 500, 502, 503]) {
    const outbox = memoryOutbox([{ id: "edit-1" }], failWith(status));
    for (let run = 0; run < 10; run += 1) {
      await replayQueue(outbox.store, { ...online, now: () => (run + 1) * 60 * 60_000 });
    }
    assert.equal(outbox.rows.size, 1, `status ${status} kept`);
    assert.equal(outbox.rows.get("edit-1").needsAttention, false, `status ${status} not given up`);
  }
});

test("only a successful replay removes an edit", async () => {
  const outbox = memoryOutbox([{ id: "edit-1" }, { id: "edit-2" }], async () => undefined);
  await replayQueue(outbox.store, { ...online, now: () => 0 });
  assert.equal(outbox.rows.size, 0);
  assert.deepEqual(outbox.ran, ["edit-1", "edit-2"]);
});

test("offline, nothing is attempted", async () => {
  const outbox = memoryOutbox([{ id: "edit-1" }], async () => undefined);
  await replayQueue(outbox.store, { isOnline: () => false, isStopped: () => false, now: () => 0 });
  assert.deepEqual(outbox.ran, []);
  assert.equal(outbox.rows.size, 1);
});

test("a temporary failure waits out its backoff, and stops the run so later edits keep their order", async () => {
  let fail = true;
  const outbox = memoryOutbox([{ id: "edit-1" }, { id: "edit-2" }], async (operation) => {
    if (fail && operation.id === "edit-1") throw Object.assign(new Error("offline"), { status: 0 });
  });

  await replayQueue(outbox.store, { ...online, now: () => 0 });
  assert.deepEqual(outbox.ran, ["edit-1"]);
  assert.equal(outbox.rows.get("edit-1").nextAttemptAt, retryDelayMs(1));

  fail = false;
  await replayQueue(outbox.store, { ...online, now: () => retryDelayMs(1) - 1 });
  assert.deepEqual(outbox.ran, ["edit-1"]);

  await replayQueue(outbox.store, { ...online, now: () => retryDelayMs(1) });
  assert.deepEqual(outbox.ran, ["edit-1", "edit-1", "edit-2"]);
  assert.equal(outbox.rows.size, 0);
});

test("when the connection comes back, waiting edits are tried at once", async () => {
  const outbox = memoryOutbox([{ id: "edit-1", attempts: 3, nextAttemptAt: 10_000 }], async () => undefined);
  await replayQueue(outbox.store, { ...online, now: () => 0, ignoreBackoff: true });
  assert.equal(outbox.rows.size, 0);
});

test("a permanent failure stays queued for repair and isn't retried", async () => {
  const outbox = memoryOutbox([{ id: "edit-1" }, { id: "edit-2" }], async (operation) => {
    if (operation.id === "edit-1") throw Object.assign(new Error("Bad request"), { status: 422 });
  });

  await replayQueue(outbox.store, { ...online, now: () => 0 });
  assert.equal(outbox.rows.get("edit-1").needsAttention, true);
  assert.equal(outbox.rows.has("edit-2"), false);

  await replayQueue(outbox.store, { ...online, now: () => 60 * 60_000 });
  assert.deepEqual(outbox.ran, ["edit-1", "edit-2"]);
  assert.equal(outbox.rows.size, 1);
});

test("signing out stops the run without changing anything", async () => {
  let signingOut = false;
  const outbox = memoryOutbox([{ id: "edit-1" }], async () => {
    signingOut = true;
    throw Object.assign(new Error("offline"), { status: 0 });
  });
  await replayQueue(outbox.store, { isOnline: () => true, isStopped: () => signingOut, now: () => 0 });
  assert.equal(outbox.rows.get("edit-1").attempts, 0);
});

test("backoff doubles from 5 seconds and stops growing at 10 minutes", () => {
  assert.equal(retryDelayMs(1), 5_000);
  assert.equal(retryDelayMs(2), 10_000);
  assert.equal(retryDelayMs(3), 20_000);
  assert.equal(retryDelayMs(20), 10 * 60_000);
});
