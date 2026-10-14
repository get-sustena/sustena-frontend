import assert from "node:assert/strict";
import { test } from "node:test";
import { lagosDate, withTodaysPickFirst } from "../src/lib/catalogue/mealPicks.ts";

const recipes = [{ id: "pap" }, { id: "jollof" }, { id: "egusi" }];
const picks = [
  { date: "2026-10-14", breakfast: "pap", lunch: "egusi", dinner: "jollof" },
  { date: "2026-10-15", breakfast: null, lunch: "jollof", dinner: "egusi" },
];

test("OFF-01: offline, Home shows today's pick for the meal first", () => {
  const at = new Date("2026-10-14T13:00:00Z");
  assert.deepEqual(withTodaysPickFirst(recipes, picks, "lunch", at).map((r) => r.id), ["egusi", "pap", "jollof"]);
  assert.deepEqual(withTodaysPickFirst(recipes, picks, "dinner", at).map((r) => r.id), ["jollof", "pap", "egusi"]);
});

test("OFF-01: today is the Lagos date, an hour ahead of UTC", () => {
  assert.equal(lagosDate(new Date("2026-10-14T22:59:00Z")), "2026-10-14");
  assert.equal(lagosDate(new Date("2026-10-14T23:30:00Z")), "2026-10-15");
  const lateNight = new Date("2026-10-14T23:30:00Z");
  assert.deepEqual(withTodaysPickFirst(recipes, picks, "dinner", lateNight).map((r) => r.id), ["egusi", "pap", "jollof"]);
});

test("OFF-01: with no pick for the day or meal, or a pick not on the phone, the order stays", () => {
  const ids = (list) => list.map((r) => r.id);
  assert.deepEqual(ids(withTodaysPickFirst(recipes, picks, "breakfast", new Date("2026-10-15T08:00:00Z"))), ["pap", "jollof", "egusi"]);
  assert.deepEqual(ids(withTodaysPickFirst(recipes, picks, "lunch", new Date("2026-11-01T12:00:00Z"))), ["pap", "jollof", "egusi"]);
  const missing = [{ date: "2026-10-14", breakfast: "moi-moi", lunch: null, dinner: null }];
  assert.deepEqual(ids(withTodaysPickFirst(recipes, missing, "breakfast", new Date("2026-10-14T08:00:00Z"))), ["pap", "jollof", "egusi"]);
  assert.deepEqual(ids(withTodaysPickFirst(recipes, null, "breakfast", new Date("2026-10-14T08:00:00Z"))), ["pap", "jollof", "egusi"]);
});

test("OFF-01: each account keeps its own picks", async () => {
  const { openTestDatabase } = await import("./helpers/sqlite.mjs");
  const { saveMealPicks, getSavedMealPicks } = await import("../src/lib/catalogue/mealPicks.ts");
  const { db } = await openTestDatabase();
  await saveMealPicks(db, "user-a", picks, "2026-10-14T12:00:00.000Z");

  assert.deepEqual(await getSavedMealPicks(db, "user-a"), picks);
  assert.equal(await getSavedMealPicks(db, "user-b"), null);
});
