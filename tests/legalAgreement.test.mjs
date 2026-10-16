import assert from "node:assert/strict";
import { test } from "node:test";
import { agreementError, agreedOnText } from "../src/lib/legal/agreement.ts";

test("both ticks are needed, the age tick first", () => {
  assert.equal(agreementError({ adult: false, terms: false }), "Tick the box to confirm you're at least 18, or have permission from a parent or guardian.");
  assert.equal(agreementError({ adult: true, terms: false }), "Tick the box to agree to the Terms of Service and the Privacy Policy.");
  assert.equal(agreementError({ adult: true, terms: true }), null);
});

test("the Legal rows say when the account agreed, as a full date in Lagos", () => {
  assert.equal(agreedOnText("2026-10-14T23:30:00Z"), "Agreed on 15 October 2026");
  assert.equal(agreedOnText(null), "Not agreed yet");
});
