import assert from "node:assert/strict";
import { test } from "node:test";
import { agreementError, agreedOnText, readDateOfBirth } from "../src/lib/legal/agreement.ts";

const TODAY = "2026-10-15";
const dob = (d, m, y) => ({ d, m, y });
const form = (overrides = {}) => ({ dob: dob("15", "10", "1990"), terms: true, parent: false, ...overrides });

test("a date of birth is read from the three boxes, with the age on today's date", () => {
  assert.deepEqual(readDateOfBirth(dob("15", "10", "1990"), TODAY), { state: "ok", iso: "1990-10-15", age: 36 });
  assert.deepEqual(readDateOfBirth(dob("16", "10", "2008"), TODAY), { state: "ok", iso: "2008-10-16", age: 17 });
  assert.deepEqual(readDateOfBirth(dob("5", "3", "2010"), TODAY), { state: "ok", iso: "2010-03-05", age: 16 });
});

test("an unfinished date is empty, an impossible one is bad", () => {
  assert.deepEqual(readDateOfBirth(dob("", "", ""), TODAY), { state: "empty" });
  assert.deepEqual(readDateOfBirth(dob("15", "10", "199"), TODAY), { state: "empty" });
  assert.deepEqual(readDateOfBirth(dob("30", "02", "2000"), TODAY), { state: "bad" });
  assert.deepEqual(readDateOfBirth(dob("12", "13", "2000"), TODAY), { state: "bad" });
  assert.deepEqual(readDateOfBirth(dob("01", "01", "1899"), TODAY), { state: "bad" });
  assert.deepEqual(readDateOfBirth(dob("16", "10", "2026"), TODAY), { state: "bad" });
});

test("the checks run in v6.9's order, with its words", () => {
  assert.equal(agreementError(form({ dob: dob("", "", "") }), TODAY), "Enter your date of birth.");
  assert.equal(agreementError(form({ dob: dob("31", "04", "2000") }), TODAY), "Enter a real date of birth.");
  assert.equal(agreementError(form({ dob: dob("16", "10", "2013") }), TODAY), "You need to be 13 or older to use Sustena.");
  assert.equal(
    agreementError(form({ dob: dob("15", "10", "2013"), terms: false }), TODAY),
    "Tick the box to confirm your parent or guardian agrees."
  );
  assert.equal(
    agreementError(form({ terms: false }), TODAY),
    "Tick the box to agree to the Terms of Service and the Privacy Policy."
  );
});

test("13 to 17 can continue with the parent tick; 18 and over don't need it", () => {
  assert.equal(agreementError(form({ dob: dob("15", "10", "2013"), parent: true }), TODAY), null);
  assert.equal(agreementError(form({ dob: dob("15", "10", "2008") }), TODAY), null);
  assert.equal(agreementError(form(), TODAY), null);
});

test("the Legal rows say when the account agreed, as a full date in Lagos", () => {
  assert.equal(agreedOnText("2026-10-14T23:30:00Z"), "Agreed on 15 October 2026");
  assert.equal(agreedOnText(null), "Not agreed yet");
});
