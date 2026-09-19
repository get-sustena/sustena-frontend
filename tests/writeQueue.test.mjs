import assert from "node:assert/strict";
import { test } from "node:test";
import { enqueueWrite } from "../src/db/writeQueue.ts";

test("writes on one database wait for the prior write", async () => {
  const database = {};
  const order = [];
  let releaseFirst;
  const first = enqueueWrite(database, async () => {
    order.push("first-start");
    await new Promise((resolve) => { releaseFirst = resolve; });
    order.push("first-end");
  });
  const second = enqueueWrite(database, async () => {
    order.push("second-start");
  });

  await Promise.resolve();
  assert.deepEqual(order, ["first-start"]);
  releaseFirst();
  await Promise.all([first, second]);
  assert.deepEqual(order, ["first-start", "first-end", "second-start"]);
});

test("a failed write does not block later writes", async () => {
  const database = {};
  const first = enqueueWrite(database, async () => { throw new Error("write failed"); });
  const second = enqueueWrite(database, async () => "saved");

  await assert.rejects(first, /write failed/);
  assert.equal(await second, "saved");
});
