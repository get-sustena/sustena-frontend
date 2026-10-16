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

// Founder, 2026-10-16: "a step should not say grams..it should only use the counting pieces and stuff".
test("small shares read as a quarter, never grams; pinches keep their own amount", () => {
  const cases = [
    [measure("item", "medium", "0.36"), 0.5, "normal", "¼ medium"], // Jollof onion, 19 g
    [measure("bunch", null, "0.312"), 0.5, "normal", "¼ bunch"], // Ewedu, 75 g
    [measure("clove", null, "0.2"), 1, "sensitive", "¼ clove"], // garlic, 1 g
    [measure("item", null, "0.2"), 1, "whole", "1 piece"], // eggs stay whole
  ];
  for (const [line, servingFactor, rule, expected] of cases) {
    assert.equal(measureAmountText(line, servingFactor, rule), expected, `${line.exactQuantity} ${line.unit}`);
  }
  assert.equal(measureAmountText(measure("pinch", null, "1"), 1, "sensitive"), null);
});

// Founder, 2026-10-16: a step showed "7 1/2g Scotch bonnet pepper" beside a line in pieces.
test("a step reads its amount in the same pieces as its ingredient line", async () => {
  const { formatScaledInstruction } = await import("../src/lib/instructionScaling.ts");
  const segment = (baseQuantity) => ({
    type: "quantity", text: `${baseQuantity}g`, recipeIngredientId: "rodo", ingredientPosition: 1,
    baseQuantity, unit: "g", scalesWithServings: true,
  });
  const step = (quantity) => ({
    text: "", segments: [{ type: "text", text: "Add " }, segment(quantity), { type: "text", text: " Scotch bonnet pepper" }],
  });
  const shown = (quantity, selectedServings) =>
    formatScaledInstruction({
      instruction: step(quantity),
      baseServings: 2,
      selectedServings,
      unitsById: new Map(),
      selectedUnitByIngredientId: new Map(),
      countRuleByIngredientId: new Map([["rodo", "sensitive"]]),
      measureByIngredientId: new Map([["rodo", { measure: measure("item", null, "1.5"), quantity: 7.5, unit: "g" }]]),
    });
  assert.equal(shown("7.5", 2), "Add 1 ½ pieces Scotch bonnet pepper");
  assert.equal(shown("7.5", 4), "Add 3 pieces Scotch bonnet pepper");
  assert.equal(shown("1", 2), "Add ¼ piece Scotch bonnet pepper");
});

// Founder, 2026-10-16: "1/2 tsp is better than 3ml".
test("a step at the recipe's own servings reads like its ingredient line", async () => {
  const { formatScaledInstruction } = await import("../src/lib/instructionScaling.ts");
  const tsp = { id: "tsp", name: "Teaspoon", context: "volume", baseUnit: "mL", baseFactorMin: 5, baseFactorMax: 5, isApproximate: false };
  const shown = formatScaledInstruction({
    instruction: {
      text: "",
      segments: [
        { type: "text", text: "Add " },
        { type: "quantity", text: "0.5 teaspoons", recipeIngredientId: "iru", ingredientPosition: 1, baseQuantity: "0.5", unit: "tsp", scalesWithServings: true },
        { type: "text", text: " iru" },
      ],
    },
    baseServings: 2,
    selectedServings: 2,
    unitsById: new Map([["tsp", tsp]]),
    selectedUnitByIngredientId: new Map([["iru", "tsp"]]),
  });
  assert.equal(shown, "Add ½ tsp iru");
});
