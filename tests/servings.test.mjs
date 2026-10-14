import assert from "node:assert/strict";
import { test } from "node:test";
import { getStoredPreferences, mapStoredPreferencesRow, saveStoredPreferences } from "../src/db/preferencesRepository.ts";
import { MAX_SERVINGS, MIN_SERVINGS, parseServingsInput, stepServings } from "../src/lib/servings.ts";
import { usePreferencesStore } from "../src/store/preferencesStore.ts";
import { openTestDatabase } from "./helpers/sqlite.mjs";

test("SRV-01: servings run from 1 to 500, matching the server", () => {
  assert.equal(MIN_SERVINGS, 1);
  assert.equal(MAX_SERVINGS, 500);
});

test("SRV-01: typing 200 sets 200 servings", () => {
  assert.deepEqual(parseServingsInput("200"), { value: 200 });
  assert.deepEqual(parseServingsInput(" 12 "), { value: 12 });
  assert.deepEqual(parseServingsInput("500"), { value: 500 });
});

test("SRV-01: 501 is refused with a plain message", () => {
  assert.deepEqual(parseServingsInput("501"), { error: "The most is 500 servings." });
});

test("SRV-01: empty, zero and part numbers are refused with a plain message", () => {
  assert.deepEqual(parseServingsInput(""), { error: "Enter how many servings." });
  assert.deepEqual(parseServingsInput("0"), { error: "The fewest is 1 serving." });
  assert.deepEqual(parseServingsInput("2.5"), { error: "Enter a whole number, like 4." });
  assert.deepEqual(parseServingsInput("four"), { error: "Enter a whole number, like 4." });
  assert.deepEqual(parseServingsInput("-3"), { error: "Enter a whole number, like 4." });
});

test("SRV-01: − and + stop at 1 and 500", () => {
  assert.equal(stepServings(1, -1), 1);
  assert.equal(stepServings(2, -1), 1);
  assert.equal(stepServings(499, 1), 500);
  assert.equal(stepServings(500, 1), 500);
  assert.equal(stepServings(25, 1), 26);
});

test("SRV-01: the default serving size keeps 200, and stays saved", async () => {
  usePreferencesStore.getState().setDefaultServingSize(200);
  assert.equal(usePreferencesStore.getState().defaultServingSize, 200);
  usePreferencesStore.getState().setDefaultServingSize(900);
  assert.equal(usePreferencesStore.getState().defaultServingSize, 500);

  const { db } = await openTestDatabase();
  await saveStoredPreferences(db, {
    healthConditions: [],
    dietaryPreference: "none",
    defaultUnitMode: "metric",
    defaultServingSize: 200,
    hapticsEnabled: true,
    dataSaverEnabled: false,
    mealRemindersEnabled: true,
    hasCompletedOnboarding: true,
  });
  assert.equal(mapStoredPreferencesRow(await getStoredPreferences(db))?.defaultServingSize, 200);
});
