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

const { filterPantryPickerIngredients } = require("../src/lib/pantryIngredients.ts");

function ingredient(id, displayName, categoryName) {
  return {
    id,
    displayName,
    canonicalName: displayName.toLowerCase(),
    categoryName,
    aliases: [],
    searchTerms: [],
    localNames: [],
  };
}

const catalog = [
  ingredient("yam", "Yam", "Tubers"),
  ingredient("egg", "Egg", "Dairy, eggs and alternatives"),
  ingredient("beef", "Beef", "Meat"),
];

test("the pantry All tab returns the complete catalogue", () => {
  assert.deepEqual(
    filterPantryPickerIngredients(catalog, "", "All").map((item) => item.id),
    ["beef", "egg", "yam"]
  );
});

test("pantry category and search filters still use the complete catalogue", () => {
  assert.deepEqual(
    filterPantryPickerIngredients(catalog, "", "Dairy").map((item) => item.id),
    ["egg"]
  );
  assert.deepEqual(
    filterPantryPickerIngredients(catalog, "ya", "Dairy").map((item) => item.id),
    ["yam"]
  );
});
