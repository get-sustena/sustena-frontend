// The units table as last fetched, so adding recipes to a list converts
// amounts offline the way the server does (SL-06). It isn't anyone's own
// data, so it stays after sign-out. Shared by the app and its tests.
import type { SQLiteDatabase } from "expo-sqlite";
import type { Unit } from "../types/api.ts";
import { getLocalMetadata, setLocalMetadata } from "./recipeRows.ts";

const KEY = "units_catalog";

export async function getSavedUnits(db: SQLiteDatabase) {
  const saved = await getLocalMetadata(db, KEY);
  if (!saved) return null;
  try {
    return JSON.parse(saved) as Unit[];
  } catch {
    return null;
  }
}

export async function saveUnits(db: SQLiteDatabase, units: Unit[]) {
  await setLocalMetadata(db, KEY, JSON.stringify(units), new Date().toISOString());
}
