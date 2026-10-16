import assert from "node:assert/strict";
import { test } from "node:test";
import { isEmailAddress } from "../src/lib/emailAddress.ts";

test("a normal address passes, with spaces around it trimmed", () => {
  assert.equal(isEmailAddress("ada@example.com"), true);
  assert.equal(isEmailAddress("  ada.test+food@mail.example.ng "), true);
});

test("addresses missing a part are refused", () => {
  for (const value of ["", "ada", "ada@", "@example.com", "ada@example", "ada @example.com", "ada@@example.com"]) {
    assert.equal(isEmailAddress(value), false, value);
  }
});
