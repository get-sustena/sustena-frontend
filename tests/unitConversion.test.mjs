import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const require = createRequire(import.meta.url);
const Module = require("node:module");
const ts = require("typescript");

Module._extensions[".ts"] = (module, filename) => {
  const source = readFileSync(filename, "utf8");
  const compiled = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    fileName: filename,
  }).outputText;
  module._compile(compiled, filename);
};

const {
  buildScaleUnitOptions,
  buildUnitLookup,
  convertIngredientQuantity,
  getAvailableModesForContext,
  getIngredientConversionContext,
  getUnitModeForUnitId,
} = require("../src/lib/unitConversion.ts");

const units = [
  { id: "cube", name: "Cube", context: "seasoning_cube", baseUnit: "g", baseFactorMin: 2, baseFactorMax: 2, isApproximate: false },
  { id: "g", name: "Gram", context: "mass", baseUnit: "g", baseFactorMin: 1, baseFactorMax: 1, isApproximate: false },
  { id: "oz", name: "Ounce", context: "mass", baseUnit: "g", baseFactorMin: 28.349523125, baseFactorMax: 28.349523125, isApproximate: false },
];
const unitsById = buildUnitLookup(units);

test("seasoning cubes use cube as their default metric unit", () => {
  const context = getIngredientConversionContext({ conversionContext: "seasoning_cube" });

  assert.equal(getUnitModeForUnitId("cube"), "metric");
  assert.deepEqual(getAvailableModesForContext(context), ["metric", "imperial"]);
  assert.deepEqual(
    convertIngredientQuantity({ unitsById, quantity: 0.5, fromUnit: "cube", context, mode: "metric" }),
    { quantity: 0.5, unit: "cube", isApproximate: false }
  );
  assert.equal(
    buildScaleUnitOptions({ units, quantity: 0.5, fromUnit: "cube", context, mode: "metric" })
      .find((option) => option.unit === "g")?.quantity,
    1
  );
});

test("an unrecognized server context cannot crash recipe rendering", () => {
  const context = "future_context";

  assert.deepEqual(getAvailableModesForContext(context), []);
  assert.equal(
    convertIngredientQuantity({ unitsById, quantity: 2, fromUnit: "cube", context, mode: "metric" }),
    null
  );
  assert.equal(
    convertIngredientQuantity({ unitsById, quantity: 2, fromUnit: "cube", context, mode: "cups" }),
    null
  );
});

const { countRuleFor, friendlyCount } = require("../src/lib/friendlyAmounts.ts");
const { formatAmountInUnit } = require("../src/lib/unitConversion.ts");

const kitchenUnits = [
  { id: "g", name: "Gram", context: "mass", baseUnit: "g", baseFactorMin: 1, baseFactorMax: 1, isApproximate: false },
  { id: "kg", name: "Kilogram", context: "mass", baseUnit: "g", baseFactorMin: 1000, baseFactorMax: 1000, isApproximate: false },
  { id: "rice_g", name: "Gram of uncooked rice", context: "rice", baseUnit: "g", baseFactorMin: 1, baseFactorMax: 1, isApproximate: false },
  { id: "rice_derica_small", name: "Small Derica cup, level rice", context: "rice", baseUnit: "g", baseFactorMin: 400, baseFactorMax: 400, isApproximate: true },
  { id: "mL", name: "Millilitre", context: "volume", baseUnit: "mL", baseFactorMin: 1, baseFactorMax: 1, isApproximate: false },
  { id: "tsp", name: "Teaspoon", context: "volume", baseUnit: "mL", baseFactorMin: 5, baseFactorMax: 5, isApproximate: false },
  { id: "tbsp", name: "Tablespoon", context: "volume", baseUnit: "mL", baseFactorMin: 15, baseFactorMax: 15, isApproximate: false },
  { id: "milk_cup", name: "Milk cup", context: "volume", baseUnit: "mL", baseFactorMin: 150, baseFactorMax: 150, isApproximate: true },
];
const kitchenUnitsById = buildUnitLookup(kitchenUnits);

// How an amount reads on the recipe page (founder, 2026-10-16).
test("amounts read the way people cook", () => {
  const shown = ({ quantity, unit, context, mode }) => {
    const converted = convertIngredientQuantity({ unitsById: kitchenUnitsById, quantity, fromUnit: unit, context, mode });
    return formatAmountInUnit(kitchenUnitsById, converted);
  };
  const cases = [
    [{ quantity: 15, unit: "mL", context: "volume", mode: "cups" }, "1 tbsp"],
    [{ quantity: 10, unit: "mL", context: "volume", mode: "cups" }, "2 tsp"],
    [{ quantity: 300, unit: "mL", context: "volume", mode: "cups" }, "≈2 Milk cups"],
    [{ quantity: 120, unit: "mL", context: "volume", mode: "cups" }, "≈¾ Milk cup"],
    [{ quantity: 100, unit: "g", context: "rice", mode: "cups" }, "100 g"],
    [{ quantity: 600, unit: "g", context: "rice", mode: "cups" }, "≈1 ½ Small Derica cups"],
    [{ quantity: 37.6, unit: "g", context: "mass", mode: "metric" }, "38 g"],
    [{ quantity: 1370, unit: "g", context: "mass", mode: "metric" }, "1 ¼ kg"],
    [{ quantity: 1.65, unit: "tsp", context: "volume", mode: "cups" }, "1 ⅔ tsp"],
    [{ quantity: 5, unit: "mL", context: "mass", mode: "cups" }, "1 tsp"],
    [{ quantity: 0.1, unit: "tsp", context: "volume", mode: "cups" }, "a pinch"],
    [{ quantity: 0.3, unit: "g", context: "mass", mode: "metric" }, "a pinch"],
    [{ quantity: 2.5, unit: "mL", context: "volume", mode: "metric" }, "½ tsp"],
    [{ quantity: 30, unit: "mL", context: "volume", mode: "metric" }, "2 tbsp"],
    [{ quantity: 250, unit: "mL", context: "volume", mode: "metric" }, "250 mL"],
  ];
  for (const [amount, expected] of cases) assert.equal(shown(amount), expected, JSON.stringify(amount));

  const counts = [
    [1.6, "normal", "2"],
    [1.05, "normal", "1 ½"],
    [1.5, "normal", "1 ½"],
    [0.2, "normal", "½"],
    [1.6, "sensitive", "1 ½"],
    [1.05, "sensitive", "1"],
    [1.7, "sensitive", "2"],
    [0.5, "whole", "1"],
    [2.3, "whole", "3"],
  ];
  for (const [value, rule, expected] of counts) assert.equal(friendlyCount(value, rule), expected, `${value} ${rule}`);
});

// Founder, 2026-10-16: "1.6 should be 2 as long as it's not a sensitive ingredient".
test("strong ingredients round counts down, everything else rounds up", () => {
  const rules = [
    [{ id: "scotch-bonnet-pepper", subcategory: "Pepper" }, "sensitive"],
    [{ id: "seasoning-cube", subcategory: "Seasoning" }, "sensitive"],
    [{ id: "salt", subcategory: "Basic seasoning" }, "sensitive"],
    [{ id: "red-bell-pepper", subcategory: "Pepper" }, "normal"],
    [{ id: "onion", subcategory: "Allium" }, "normal"],
    [{ id: "uziza-leaf", subcategory: "Leafy vegetable" }, "sensitive"],
    [{ id: "bitter-leaf", subcategory: "Leafy vegetable" }, "normal"],
    [{ id: "egg", subcategory: "Egg" }, "whole"],
    [{ id: "onion", subcategory: "Allium", countRule: "sensitive" }, "sensitive"],
    [undefined, "normal"],
  ];
  for (const [ingredient, expected] of rules) assert.equal(countRuleFor(ingredient), expected, ingredient?.id);
});

test("Nigerian units under half a cup never show in the unit picker", () => {
  const options = buildScaleUnitOptions({ units: kitchenUnits, quantity: 15, fromUnit: "mL", context: "volume", mode: "cups" });
  assert.deepEqual(options.map((option) => option.preview), ["1 tbsp"]);
});

test("kilograms and litres never show for an amount too small for them", () => {
  const options = buildScaleUnitOptions({ units: kitchenUnits, quantity: 5, fromUnit: "g", context: "mass", mode: "metric" });
  assert.deepEqual(options.map((option) => option.preview), ["5 g"]);
});

// Founder, 2026-10-16: "1/2 tsp is better than 3ml".
test("a small metric volume can be picked in spoons", () => {
  const options = buildScaleUnitOptions({ units: kitchenUnits, quantity: 2.5, fromUnit: "mL", context: "volume", mode: "metric" });
  assert.ok(options.some((option) => option.preview === "½ tsp"));
});
