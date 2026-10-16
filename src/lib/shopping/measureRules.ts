// Pieces, bunches and cubes on a shopping list (P-17), worked out on the
// phone. A port of cookease-backend app/services/ingredient_measures.py
// (measure_named, normalized_size) and shopping_list_service.py
// (_bought_amount, _in_existing_measures), pinned to them by the server's
// fixtures. A recipe line in pieces goes on a list in grams, by the
// ingredient's own weights, so it adds up with the same food in grams.
import type { IngredientMeasure } from "../../types/api.ts";
import { MASS_GRAMS, MEASURE_LABELS } from "./shoppingRules.ts";

const SIZES = new Set(["small", "medium", "large"]);

// The measure a line names. Without a size, or with one the ingredient
// doesn't have, it's the default of that unit, then its medium, then its
// only one.
function measureNamed(measures: IngredientMeasure[], unit: string, size: string | null) {
  const sameUnit = measures.filter((measure) => measure.unit === unit);
  return (
    sameUnit.find((measure) => measure.size === size) ??
    sameUnit.find((measure) => measure.isDefault) ??
    sameUnit.find((measure) => measure.size === "medium") ??
    (sameUnit.length === 1 ? sameUnit[0] : null)
  );
}

// "Medium " reads as "medium"; any other size note is the creator's own words.
function normalizedSize(sizeNote: string | null) {
  const size = (sizeNote ?? "").trim().toLowerCase();
  return SIZES.has(size) ? size : null;
}

// The amount a recipe line adds to a list: grams for a line in pieces,
// bunches or cubes of an ingredient with known weights.
export function boughtAmount(
  quantity: number | null,
  unit: string | null,
  sizeNote: string | null,
  measures: IngredientMeasure[]
): [number | null, string | null] {
  if (quantity !== null && unit !== null && unit in MEASURE_LABELS) {
    const measure = measureNamed(measures, unit, normalizedSize(sizeNote));
    if (measure) return [quantity * Number(measure.grams), "g"];
  }
  return [quantity, unit];
}

// Grams from a recipe as a share of the pieces or bunches a row is already
// in, so lists made before measures keep one row per ingredient.
export function inExistingMeasures(rowUnit: string, amount: number, unit: string, measures: IngredientMeasure[]) {
  if (!(rowUnit in MEASURE_LABELS) || !(unit in MASS_GRAMS)) return null;
  const measure = measureNamed(measures, rowUnit, null);
  return measure ? (amount * MASS_GRAMS[unit]) / Number(measure.grams) : null;
}
