import assert from "node:assert/strict";
import { test } from "node:test";
import {
  fullDate,
  homeReminder,
  linkStillWorks,
  linkWorksUntil,
  profileReminderResting,
} from "../src/lib/reminders/homeReminders.ts";

test("a link sent on 15 October works until Thursday 22 October 2026", () => {
  assert.equal(linkWorksUntil("2026-10-15"), "Thursday 22 October 2026");
  assert.equal(fullDate("2026-01-01"), "Thursday 1 January 2026");
});

test("a sent link counts as sent for 7 days, then the card asks again", () => {
  assert.equal(linkStillWorks("2026-10-15", "2026-10-22"), true);
  assert.equal(linkStillWorks("2026-10-15", "2026-10-23"), false);
});

test("a dismissed profile card rests for 7 days, then comes back", () => {
  assert.equal(profileReminderResting(null, "2026-10-15"), false);
  assert.equal(profileReminderResting("2026-10-15", "2026-10-21"), true);
  assert.equal(profileReminderResting("2026-10-15", "2026-10-22"), false);
});

test("Home shows one reminder: the email first, then the profile", () => {
  const today = "2026-10-15";
  const base = { emailConfirmed: false, answered: 3, total: 11, dismissedOn: null, today };
  assert.equal(homeReminder(base), "email");
  assert.equal(homeReminder({ ...base, emailConfirmed: true }), "profile");
  assert.equal(homeReminder({ ...base, emailConfirmed: true, answered: 11 }), null);
  assert.equal(homeReminder({ ...base, emailConfirmed: true, dismissedOn: today }), null);
  // Dismissing the profile card never hides the email one.
  assert.equal(homeReminder({ ...base, dismissedOn: today }), "email");
});

test("nothing shows while the account isn't known yet (an offline start)", () => {
  assert.equal(homeReminder({ emailConfirmed: null, answered: 0, total: 11, dismissedOn: null, today: "2026-10-15" }), null);
});
