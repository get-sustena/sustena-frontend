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
