import assert from "node:assert/strict";
import { test } from "node:test";
import { createSessionRefresher } from "../src/lib/api/sessionRefresh.ts";

// A session whose refresh request answers as `answers` says, in order.
function session(answers) {
  const state = { tokens: { accessToken: "old-access", refreshToken: "refresh-1" }, cleared: 0, ended: 0, asked: 0 };
  const refresher = createSessionRefresher({
    readRefreshToken: async () => state.tokens?.refreshToken ?? null,
    requestRefresh: async () => {
      state.asked += 1;
      const answer = answers.shift();
      if (answer instanceof Error) throw answer;
      return answer;
    },
    saveTokens: async (tokens) => {
      state.tokens = tokens;
    },
    clearTokens: async () => {
      state.cleared += 1;
      state.tokens = null;
    },
    endSession: () => {
      state.ended += 1;
    },
  });
  return { state, refresher };
}

const failure = (status, message = `status ${status}`) => Object.assign(new Error(message), { status });

test("F01: a refresh that times out, then gets a 5xx, keeps the person signed in with their tokens", async () => {
  const { state, refresher } = session([failure(0, "timeout of 15000ms exceeded"), failure(503)]);

  const first = await refresher.refresh();
  const second = await refresher.refresh();

  assert.equal(first.kind, "unavailable");
  assert.equal(second.kind, "unavailable");
  assert.deepEqual(state.tokens, { accessToken: "old-access", refreshToken: "refresh-1" });
  assert.equal(state.cleared, 0);
  assert.equal(state.ended, 0);
});

test("rate limits are temporary too", async () => {
  const { state, refresher } = session([failure(429)]);
  assert.equal((await refresher.refresh()).kind, "unavailable");
  assert.equal(state.ended, 0);
});

test("only a confirmed invalid refresh token ends the session, and only once", async () => {
  const { state, refresher } = session([failure(401, "Invalid refresh token")]);

  const outcome = await refresher.refresh();

  assert.equal(outcome.kind, "rejected");
  assert.equal(state.tokens, null);
  assert.equal(state.cleared, 1);
  assert.equal(state.ended, 1);
});

test("with no refresh token saved, the session ends once", async () => {
  const { state, refresher } = session([]);
  state.tokens = null;
  assert.equal((await refresher.refresh()).kind, "rejected");
  assert.equal(state.asked, 0);
  assert.equal(state.ended, 1);
});

test("a successful refresh saves the new tokens", async () => {
  const fresh = { accessToken: "new-access", refreshToken: "refresh-2" };
  const { state, refresher } = session([fresh]);
  const outcome = await refresher.refresh();
  assert.deepEqual(outcome, { kind: "refreshed", tokens: fresh });
  assert.deepEqual(state.tokens, fresh);
});

test("requests that expire together share one refresh", async () => {
  const fresh = { accessToken: "new-access", refreshToken: "refresh-2" };
  const { state, refresher } = session([fresh]);
  const outcomes = await Promise.all([refresher.refresh(), refresher.refresh(), refresher.refresh()]);
  assert.equal(state.asked, 1);
  assert.ok(outcomes.every((outcome) => outcome.kind === "refreshed"));
});
