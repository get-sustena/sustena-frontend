import assert from "node:assert/strict";
import { test } from "node:test";
import { getSavedUnits, saveUnits } from "../src/db/unitsRepository.ts";
import { openTestDatabase } from "./helpers/sqlite.mjs";

test("SL-06: the units table is kept on the phone, so recipes add with the right amounts offline", async () => {
  const { db } = await openTestDatabase();
  assert.equal(await getSavedUnits(db), null);

  const units = [{ id: "kg", name: "kilogram", context: "metric", baseUnit: "g", baseFactorMin: "1000", baseFactorMax: "1000", isApproximate: false }];
  await saveUnits(db, units);
  assert.deepEqual(await getSavedUnits(db), units);
});
