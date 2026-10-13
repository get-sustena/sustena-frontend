import assert from "node:assert/strict";
import { test } from "node:test";
import { getMealTime, isRecipeForMealTime } from "../src/lib/mealTime.ts";

function at(hours, minutes = 0) {
  return new Date(2026, 9, 13, hours, minutes);
}

test("breakfast runs from 6:00 to 10:59", () => {
  assert.equal(getMealTime(at(6, 0)), "breakfast");
  assert.equal(getMealTime(at(10, 59)), "breakfast");
});

test("lunch runs from 11:00 to 15:59", () => {
  assert.equal(getMealTime(at(11, 0)), "lunch");
  assert.equal(getMealTime(at(15, 59)), "lunch");
});

test("dinner runs from 16:00 through the night until 5:59", () => {
  assert.equal(getMealTime(at(16, 0)), "dinner");
  assert.equal(getMealTime(at(23, 59)), "dinner");
  assert.equal(getMealTime(at(0, 0)), "dinner");
  assert.equal(getMealTime(at(5, 59)), "dinner");
});

function recipe(tags, categories = []) {
  return { tags, categories };
}

test("a drink never counts as a meal", () => {
  assert.equal(isRecipeForMealTime(recipe(["breakfast", "smoothie"]), "breakfast"), false);
  assert.equal(isRecipeForMealTime(recipe(["dinner", "main-meal"], ["drink"]), "dinner"), false);
});

test("a swallow counts only at dinner", () => {
  const amala = recipe(["swallow", "lunch", "main-meal"]);
  assert.equal(isRecipeForMealTime(amala, "dinner"), true);
  assert.equal(isRecipeForMealTime(amala, "lunch"), false);
  assert.equal(isRecipeForMealTime(amala, "breakfast"), false);
});

test("a recipe needs the meal's own tag", () => {
  assert.equal(isRecipeForMealTime(recipe(["breakfast"]), "breakfast"), true);
  assert.equal(isRecipeForMealTime(recipe([], ["breakfast"]), "breakfast"), false);
  assert.equal(isRecipeForMealTime(recipe(["lunch", "main-meal"]), "breakfast"), false);
});

test("savoury oats tagged breakfast are not offered for dinner", () => {
  const oats = recipe(["breakfast", "main-meal"], ["breakfast", "main-meal"]);
  assert.equal(isRecipeForMealTime(oats, "breakfast"), true);
  assert.equal(isRecipeForMealTime(oats, "dinner"), false);
});

test("lunch and dinner need the meal and main-meal", () => {
  assert.equal(isRecipeForMealTime(recipe(["lunch"]), "lunch"), false);
  assert.equal(isRecipeForMealTime(recipe(["lunch", "main-meal"]), "lunch"), true);
  assert.equal(isRecipeForMealTime(recipe(["dinner"], ["main-meal"]), "dinner"), true);
});

test("soups, sauces and sides count only when also a main meal", () => {
  assert.equal(isRecipeForMealTime(recipe(["breakfast", "sauce"]), "breakfast"), false);
  assert.equal(isRecipeForMealTime(recipe(["breakfast", "sauce", "main-meal"]), "breakfast"), true);
  assert.equal(isRecipeForMealTime(recipe(["dinner", "soup"], ["main-meal"]), "dinner"), true);
});

test("labels match regardless of case, spaces or underscores", () => {
  assert.equal(isRecipeForMealTime(recipe(["Lunch", "Main Meal"]), "lunch"), true);
  assert.equal(isRecipeForMealTime(recipe(["Breakfast", "side_dish"]), "breakfast"), false);
});
