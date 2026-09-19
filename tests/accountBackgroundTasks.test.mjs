import assert from "node:assert/strict";
import { test } from "node:test";
import {
  trackAccountBackgroundTask,
  waitForAccountBackgroundTasks,
} from "../src/lib/accountBackgroundTasks.ts";

test("account cleanup waits for every active background task", async () => {
  let finishFirst;
  let finishSecond;
  const first = trackAccountBackgroundTask(
    new Promise((resolve) => { finishFirst = resolve; })
  );
  const second = trackAccountBackgroundTask(
    new Promise((resolve) => { finishSecond = resolve; })
  );

  let drained = false;
  const draining = waitForAccountBackgroundTasks().then(() => {
    drained = true;
  });

  finishFirst();
  await first;
  assert.equal(drained, false);

  finishSecond();
  await second;
  await draining;
  assert.equal(drained, true);
});

test("a failed background task does not prevent account cleanup", async () => {
  const failed = trackAccountBackgroundTask(Promise.reject(new Error("offline")));
  await assert.rejects(failed, /offline/);
  await waitForAccountBackgroundTasks();
});
