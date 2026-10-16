import assert from "node:assert/strict";
import { test } from "node:test";
import { measureAmountText } from "../src/lib/measures.ts";

const measure = (unit, size, exactQuantity) => ({ unit, size, quantity: exactQuantity, exactQuantity });

// Founder, 2026-10-16: "we can display them default in pieces instead of grams".
test("recipe amounts read in the pieces, cloves and bunches people count", () => {
  const cases = [
    [measure("item", "medium", "1.364"), 1, "normal", "1 ½ medium"],
    [measure("item", "medium", "1.364"), 2, "normal", "3 medium"],
    [measure("item", "medium", "0.8"), 1, "normal", "1 medium"],
    [measure("cube", "large", "2"), 1, "sensitive", "2 large cubes"],
    [measure("clove", null, "3"), 1, "normal", "3 cloves"],
    [measure("bunch", null, "0.333"), 1, "normal", "½ bunch"],
    [measure("bunch", null, "0.8"), 2, "normal", "2 bunches"],
    [measure("cube", null, "1.6"), 1, "sensitive", "1 ½ cubes"],
    [measure("cube", null, "1.6"), 1, "normal", "2 cubes"],
    [measure("sachet", null, "1"), 1, "normal", "1 sachet"],
  ];
  for (const [line, servingFactor, rule, expected] of cases) {
    assert.equal(measureAmountText(line, servingFactor, rule), expected, `${line.exactQuantity} ${line.unit} ×${servingFactor}`);
  }
});

test("tiny shares and pinches keep the recipe's own amount", () => {
  assert.equal(measureAmountText(measure("item", "medium", "0.4"), 0.5, "normal"), null);
  assert.equal(measureAmountText(measure("pinch", null, "1"), 1, "sensitive"), null);
});
