// Recipe amounts in the pieces, bunches, cloves, sachets, tins and cubes
// people count (founder, 2026-10-16: "we can display them default in pieces
// instead of grams"). The server sends each line's share of the
// ingredient's default measure; the app scales it and rounds it with the
// same count rules as everything else.
import type { MeasureUnit, RecipeLineMeasure } from "../types/api.ts";
import { friendlyCount, type CountRule } from "./friendlyAmounts.ts";

const MEASURE_LABELS: Record<MeasureUnit, [string, string]> = {
  item: ["piece", "pieces"],
  bunch: ["bunch", "bunches"],
  clove: ["clove", "cloves"],
  stalk: ["stalk", "stalks"],
  sachet: ["sachet", "sachets"],
  tin: ["tin", "tins"],
  cube: ["cube", "cubes"],
};
// Under a quarter of a piece reads better in grams.
const SMALLEST_SHARE = 0.25;

// "1 ½ medium", "3 cloves" or "½ bunch"; null when the line keeps its own
// amount (a pinch, or under a quarter of a piece). A sized piece reads like a
// recipe ("2 medium"), which also fits the amount chip.
export function measureAmountText(measure: RecipeLineMeasure, servingFactor: number, countRule: CountRule) {
  if (measure.unit === "pinch") return null;
  const share = Number(measure.exactQuantity) * servingFactor;
  if (!(share >= SMALLEST_SHARE)) return null;
  const amount = friendlyCount(share, countRule);
  const [singular, plural] = MEASURE_LABELS[measure.unit];
  const label = amount === "1" || amount === "½" ? singular : plural;
  if (measure.size && measure.unit === "item") return `${amount} ${measure.size}`;
  return measure.size ? `${amount} ${measure.size} ${label}` : `${amount} ${label}`;
}

// The measure's name in the unit sheet: "Medium pieces", "Cloves".
export function measureOptionLabel(measure: { unit: MeasureUnit; size: RecipeLineMeasure["size"] }) {
  const plural = MEASURE_LABELS[measure.unit][1];
  const label = measure.size ? `${measure.size} ${plural}` : plural;
  return label[0].toUpperCase() + label.slice(1);
}
