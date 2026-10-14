import assert from "node:assert/strict";
import { test } from "node:test";
import { formatScaledInstruction } from "../src/lib/instructionScaling.ts";
import { buildLearnSteps } from "../src/lib/learnMode/learnSteps.ts";

const unit = (id, baseFactor) => ({
  id,
  name: id,
  context: "mass",
  baseUnit: "g",
  baseFactorMin: baseFactor,
  baseFactorMax: baseFactor,
  isApproximate: false,
  precisionLabel: null,
  scope: null,
  sourceId: null,
});
const UNITS = new Map([
  ["g", unit("g", 1)],
  ["kg", unit("kg", 1000)],
]);

// "Boil 50 g of rice." for one serving; the 50 g scales with servings.
const instruction = {
  id: "step-1",
  stepNumber: 1,
  stepName: "Boil the rice",
  text: "Boil 50 g of rice.",
  commonMistake: null,
  helpfulTip: null,
  type: "instruction",
  timers: [],
  segments: [
    { type: "text", text: "Boil " },
    {
      type: "quantity",
      text: "50 g",
      recipeIngredientId: "ri-rice",
      ingredientPosition: 1,
      baseQuantity: "50",
      unit: "g",
      scalesWithServings: true,
    },
    { type: "text", text: " of rice." },
  ],
};

// What Learn mode shows for the step, given the servings and the unit the
// ingredient list picked for rice: the recipe page builds it this way.
function learnStepText(servings, riceUnit) {
  const displayText = formatScaledInstruction({
    instruction,
    baseServings: 1,
    selectedServings: servings,
    unitsById: UNITS,
    selectedUnitByIngredientId: new Map([["ri-rice", riceUnit]]),
  });
  return buildLearnSteps([{ ...instruction, displayText }], [])[0].text;
}

test("SRV-02: at 200 servings, Learn mode shows the 200-serving amount in a step", () => {
  assert.equal(learnStepText(200, "kg"), "Boil 10 kg of rice.");
});

test("SRV-02: at 500 servings, the step amount matches the ingredient list's unit", () => {
  assert.equal(learnStepText(500, "kg"), "Boil 25 kg of rice.");
  assert.equal(learnStepText(500, "g"), "Boil 25000 g of rice.");
});

test("SRV-02: at the recipe's own servings, the step reads as written", () => {
  assert.equal(learnStepText(1, "g"), "Boil 50 g of rice.");
});
