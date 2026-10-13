import assert from "node:assert/strict";
import { test } from "node:test";
import { getDeviceTimeZone, getMealReminderRecipeId } from "../src/lib/notifications/mealReminderData.ts";

test("a meal reminder points at its recipe", () => {
  assert.equal(
    getMealReminderRecipeId({ type: "meal-reminder", recipeId: "recipe-42", mealTime: "lunch" }),
    "recipe-42"
  );
});

test("anything that isn't a meal reminder with a recipe is ignored", () => {
  assert.equal(getMealReminderRecipeId({ type: "order-update", recipeId: "recipe-42" }), null);
  assert.equal(getMealReminderRecipeId({ type: "meal-reminder" }), null);
  assert.equal(getMealReminderRecipeId({ type: "meal-reminder", recipeId: "" }), null);
  assert.equal(getMealReminderRecipeId({ type: "meal-reminder", recipeId: 42 }), null);
  assert.equal(getMealReminderRecipeId(null), null);
  assert.equal(getMealReminderRecipeId("meal-reminder"), null);
});

test("the phone's time zone is used when it has one", () => {
  assert.equal(getDeviceTimeZone(() => "Europe/London"), "Europe/London");
});

test("the time zone falls back to Lagos when the phone can't say", () => {
  assert.equal(getDeviceTimeZone(() => undefined), "Africa/Lagos");
  assert.equal(getDeviceTimeZone(() => ""), "Africa/Lagos");
  assert.equal(getDeviceTimeZone(() => { throw new Error("no Intl"); }), "Africa/Lagos");
});
