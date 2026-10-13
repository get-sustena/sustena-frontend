import assert from "node:assert/strict";
import { test } from "node:test";
import { getGreeting } from "../src/lib/greeting.ts";

function at(hours, minutes = 0) {
  return new Date(2026, 9, 13, hours, minutes);
}

test("morning runs from midnight to 11:59", () => {
  assert.equal(getGreeting(at(0, 0)), "Good morning");
  assert.equal(getGreeting(at(11, 59)), "Good morning");
});

test("afternoon runs from 12:00 to 16:59", () => {
  assert.equal(getGreeting(at(12, 0)), "Good afternoon");
  assert.equal(getGreeting(at(16, 59)), "Good afternoon");
});

test("evening runs from 17:00 to 23:59", () => {
  assert.equal(getGreeting(at(17, 0)), "Good evening");
  assert.equal(getGreeting(at(23, 59)), "Good evening");
});
