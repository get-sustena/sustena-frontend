import assert from "node:assert/strict";
import { test } from "node:test";
import { getLagosDay } from "../src/lib/lagosDay.ts";
import { readRecipeSource } from "../src/lib/recipeSource.ts";

test("a Lagos day starts at 23:00 UTC the evening before", () => {
  assert.equal(getLagosDay(new Date("2026-10-13T22:59:59Z")), "2026-10-13");
  assert.equal(getLagosDay(new Date("2026-10-13T23:00:00Z")), "2026-10-14");
});

test("Lagos has no daylight saving, so the boundary holds all year", () => {
  assert.equal(getLagosDay(new Date("2026-06-30T23:00:00Z")), "2026-07-01");
  assert.equal(getLagosDay(new Date("2026-12-31T23:30:00Z")), "2027-01-01");
});

test("only sources the backend accepts are passed on", () => {
  assert.equal(readRecipeSource("home"), "home");
  assert.equal(readRecipeSource("meal_reminder"), "meal_reminder");
  assert.equal(readRecipeSource("deep-link"), undefined);
  assert.equal(readRecipeSource(undefined), undefined);
  assert.equal(readRecipeSource(["home"]), undefined);
});
