import assert from "node:assert/strict";
import { test } from "node:test";
import { convertQuantity, shoppingDisplayQuantity } from "../src/lib/shopping/shoppingRules.ts";

// The examples written in the server's shopping_list_display.py.
test("SL-06: amounts round up to whole numbers, stepping between g and kg, mL and L", () => {
  assert.equal(shoppingDisplayQuantity(0.25, "kg"), "250 g");
  assert.equal(shoppingDisplayQuantity(50000, "g"), "50 kg");
  assert.equal(shoppingDisplayQuantity(1250, "g"), "2 kg");
  assert.equal(shoppingDisplayQuantity(999.9999, "g"), "1 kg");
  assert.equal(shoppingDisplayQuantity(0.4, "L"), "400 mL");
  assert.equal(shoppingDisplayQuantity(2.0000001, "metric_cup"), "2 metric cups");
  assert.equal(shoppingDisplayQuantity(0.3, "rice_kg"), "300 g");
});

test("SL-06: counted things read in pieces, typed words stay as typed", () => {
  assert.equal(shoppingDisplayQuantity(3, null), "3 pieces");
  assert.equal(shoppingDisplayQuantity(1, "item"), "1 piece");
  assert.equal(shoppingDisplayQuantity(2, "loaves"), "2 loaves");
  assert.equal(shoppingDisplayQuantity(1.5, "big tuber"), "2 big tuber");
  assert.equal(shoppingDisplayQuantity(2, "litres"), "2 L");
});

test("SL-06: spices in a volume unit read in spoons", () => {
  assert.equal(shoppingDisplayQuantity(0.33, "metric_cup", "Dried spice"), "6 tbsp");
  assert.equal(shoppingDisplayQuantity(10, "mL", "Seasoning"), "2 tsp");
  assert.equal(shoppingDisplayQuantity(10, "mL", "Herb"), "10 mL");
});

test("SL-06: no amount, or nothing positive, has no list quantity", () => {
  assert.equal(shoppingDisplayQuantity(null, "g"), null);
  assert.equal(shoppingDisplayQuantity(0, "g"), null);
});

const units = new Map(
  [
    { id: "g", baseUnit: "g", baseFactorMin: "1", baseFactorMax: "1", isApproximate: false },
    { id: "kg", baseUnit: "g", baseFactorMin: "1000", baseFactorMax: "1000", isApproximate: false },
    { id: "mL", baseUnit: "mL", baseFactorMin: "1", baseFactorMax: "1", isApproximate: false },
    { id: "metric_cup", baseUnit: "mL", baseFactorMin: "250", baseFactorMax: "250", isApproximate: false },
    { id: "rice_derica_small", baseUnit: "g", baseFactorMin: "350", baseFactorMax: "450", isApproximate: true },
  ].map((unit) => [unit.id, unit])
);

test("SL-06: conversions use each unit's midpoint factor, and say when they're approximate", () => {
  assert.deepEqual(convertQuantity(500, "g", "kg", units), { quantity: 0.5, isApproximate: false });
  assert.deepEqual(convertQuantity(2, "metric_cup", "ml", units), { quantity: 500, isApproximate: false });
  assert.deepEqual(convertQuantity(1, "rice_derica_small", "g", units), { quantity: 400, isApproximate: true });
  assert.deepEqual(convertQuantity(3, "kg", "kg", units), { quantity: 3, isApproximate: false });
  assert.equal(convertQuantity(1, "g", "mL", units), null);
  assert.equal(convertQuantity(1, "g", "handful", units), null);
});
