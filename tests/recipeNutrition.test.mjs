import assert from "node:assert/strict";
import { test } from "node:test";
import {
  amountFor,
  dayShare,
  formatNutrient,
  formatWhole,
  ingredientCalories,
  macroSources,
  mealFills,
  nutritionFootnote,
  oilTip,
  otherNutrients,
} from "../src/lib/nutrition/recipeNutrition.ts";

const values = (kcal, proteinG = 0, carbsG = 0, fatG = 0, extra = {}) => ({
  kcal,
  proteinG,
  carbsG,
  fatG,
  fibreG: 0,
  saturatedFatG: 0,
  sodiumMg: 0,
  vitaminCMg: 0,
  ...extra,
});

const line = (name, nutrition, extra = {}) => ({
  id: name,
  ingredientId: name.toLowerCase().replace(/ /g, "-"),
  ingredientName: name,
  canonicalIngredientName: null,
  rawText: name,
  nutrition,
  isFryingOil: false,
  ...extra,
});

// A recipe for 2 servings.
const rice = line("Rice", values(700, 14, 150, 2));
const oil = line("Vegetable oil", values(360, 0, 0, 40));
const chicken = line("Chicken", values(400, 60, 0, 16));
const salt = line("Salt", null);
const ingredients = [rice, oil, chicken, salt];

test("an ingredient's calories follow the servings and name its biggest share", () => {
  assert.deepEqual(ingredientCalories(rice, ingredients, 4, 2), {
    counted: true,
    kcal: 1400,
    share: "most of the carbs",
  });
  assert.deepEqual(ingredientCalories(oil, ingredients, 2, 2), {
    counted: true,
    kcal: 360,
    share: "most of the fat",
  });
  assert.deepEqual(ingredientCalories(salt, ingredients, 2, 2), { counted: false });
});

test("a share between 40% and half reads 'about half the'", () => {
  const beans = line("Beans", values(300, 20, 50, 2));
  const egg = line("Egg", values(150, 19, 1, 1));
  const result = ingredientCalories(egg, [beans, egg], 2, 2);
  assert.equal(result.share, "about half the protein");
});

test("deep-frying oil says only what soaks in", () => {
  const frying = line("Vegetable oil", values(200, 0, 0, 22), { isFryingOil: true });
  assert.equal(ingredientCalories(frying, [rice, frying], 2, 2).share, "only what soaks in");
});

test("half the oil earns a tip on the first step that mentions oil", () => {
  const steps = ["Wash the rice.", "Heat the oil in a pot.", "Add more oil."];
  assert.deepEqual(oilTip(ingredients, steps, 2), { step: 1, saveKcal: 90 });
  assert.equal(oilTip([line("Vegetable oil", values(100))], steps, 2), null);
  assert.equal(
    oilTip([line("Vegetable oil", values(360), { isFryingOil: true })], steps, 2),
    null
  );
  assert.equal(oilTip(ingredients, ["Boil the rice."], 2), null);
});

test("plates scale every number, with calories rounded per plate first", () => {
  const perServing = values(733.4, 37, 75, 29);
  assert.equal(amountFor(perServing, "kcal", 2), 1466);
  assert.equal(amountFor(perServing, "proteinG", 0.5), 18.5);
  assert.equal(dayShare(1466, "kcal"), 73);
  assert.deepEqual(mealFills(1466), [100, 100, 20]);
  assert.deepEqual(mealFills(300), [45, 0, 0]);
});

test("a macro shows its three biggest sources, then Others", () => {
  const extra = line("Onion", values(40, 1, 9, 0));
  const pepper = line("Pepper", values(30, 1, 6, 0));
  const sources = macroSources([rice, oil, chicken, extra, pepper, salt], "carbsG", 2);
  assert.deepEqual(
    sources.map((source) => [source.label, source.perServing]),
    [
      ["Rice", 75],
      ["Onion", 4.5],
      ["Pepper", 3],
    ]
  );
  const protein = macroSources([rice, oil, chicken, extra, pepper], "proteinG", 2);
  assert.deepEqual(
    protein.map((source) => [source.label, source.perServing]),
    [
      ["Chicken", 30],
      ["Rice", 7],
      ["Onion", 0.5],
      ["Others", 0.5],
    ]
  );
});

test("vitamin C and fibre are Good from 15%; saturated fat and sodium Go easy above 30%", () => {
  const perServing = values(500, 0, 0, 0, { vitaminCMg: 13.5, fibreG: 4, saturatedFatG: 6.2, sodiumMg: 700 });
  assert.deepEqual(
    otherNutrients(perServing, 1).map((row) => [row.name, row.share, row.tag]),
    [
      ["Vitamin C", 15, "good"],
      ["Fibre", 14, null],
      ["Saturated fat", 31, "watch"],
      ["Sodium", 30, null],
    ]
  );
});

test("the footnote lists what isn't counted and the frying-oil rule", () => {
  assert.equal(nutritionFootnote([rice, salt]), "Estimates. Not counted: salt.");
  assert.equal(
    nutritionFootnote([rice, line("Oil", values(10), { isFryingOil: true })]),
    "Estimates. Frying oil counts only what the food soaks up."
  );
});

test("numbers read as the prototype shows them", () => {
  assert.equal(formatWhole(1240.4), "1,240");
  assert.equal(formatNutrient(2.46, "proteinG"), "2.5");
  assert.equal(formatNutrient(2.46, "kcal"), "2");
  assert.equal(formatNutrient(12.6, "fatG"), "13");
});
