// The server's shopping-list quantity rules, for adding recipes offline
// (SL-06). A port of cookease-backend app/services/shopping_list_display.py
// (shopping_display_quantity) and unit_conversion_service.py
// (convert_quantity), pinned to them by the fixtures the server generates.
// After a sync the server's own result replaces what the phone worked out.
// Shared by the app and its tests, so nothing here imports React Native.
import type { CountRule } from "../friendlyAmounts.ts";

const UNIT_LABELS: Record<string, string> = {
  mg: "mg",
  g: "g",
  kg: "kg",
  oz: "oz",
  lb: "lb",
  mL: "mL",
  cL: "cL",
  dL: "dL",
  L: "L",
  tsp: "tsp",
  tbsp: "tbsp",
  metric_cup: "metric cup",
  us_cup: "U.S. cup",
  imperial_cup: "Imperial cup",
  us_floz: "fl oz",
  imp_floz: "fl oz",
  milk_cup: "milk cup",
  half_milk_cup: "half milk cup",
  paint_rubber_vol: "paint/custard rubber",
  rice_derica_small: "small Derica cup",
  rice_derica_large: "large Derica cup",
  rice_congo: "Congo (Kongo)",
  rice_paint_rubber: "paint/custard rubber",
  rice_bag_50kg: "50 kg rice bag",
  flour_metric_cup: "metric cup",
  flour_milk_cup: "milk cup",
  millet_milk_cup: "milk cup",
  millet_derica_small: "small Derica cup",
  millet_congo_small: "small Congo (Kongo)",
  sorghum_milk_cup: "milk cup",
  sorghum_derica_small: "small Derica cup",
  sorghum_congo_small: "small Congo (Kongo)",
  cube: "cube",
  item: "piece",
};

const aliases = (names: string[], unit: string) => Object.fromEntries(names.map((name) => [name, unit]));
// Units people type by hand on their own items, read as the catalogue unit.
const TYPED_UNITS: Record<string, string> = {
  ...aliases(["l", "litre", "litres", "liter", "liters"], "L"),
  ...aliases(["ml", "millilitre", "millilitres", "milliliter", "milliliters"], "mL"),
  ...aliases(["kgs", "kilo", "kilos", "kilogram", "kilograms"], "kg"),
  ...aliases(["gram", "grams", "gm", "gms"], "g"),
  ...aliases(["teaspoon", "teaspoons", "tsps"], "tsp"),
  ...aliases(["tablespoon", "tablespoons", "tbsps", "tbs"], "tbsp"),
};
const ABBREVIATIONS = new Set(["mg", "g", "kg", "oz", "lb", "mL", "cL", "dL", "L", "tsp", "tbsp", "fl oz"]);
// Ingredient subcategories bought by the spoonful.
const SPOON_SUBCATEGORIES = new Set([
  "Dried spice",
  "Dried herb",
  "Spice blend",
  "Nigerian spice blend",
  "Pepper spice",
  "Seed spice",
  "Bark spice",
  "Berry spice",
  "Flower spice",
  "Pod spice",
  "Spice",
  "Basic seasoning",
  "Seasoning",
  "Fermented seasoning",
]);
// Millilitres in each volume unit.
const VOLUME_ML: Record<string, number> = {
  mL: 1,
  cL: 10,
  dL: 100,
  L: 1000,
  metric_cup: 250,
  us_cup: 236.5882365,
  imperial_cup: 284.130625,
  us_floz: 29.5735295625,
  imp_floz: 28.4130625,
  milk_cup: 150,
  half_milk_cup: 75,
  paint_rubber_vol: 4000,
};
const TABLESPOON_ML = 15;
const TEASPOON_ML = 5;
const SMALLER_UNIT: Record<string, [string, number]> = { kg: ["g", 1000], L: ["mL", 1000] };
const BIGGER_UNIT: Record<string, [string, number]> = { g: ["kg", 1000], mL: ["L", 1000] };
// Grams in each mass unit.
export const MASS_GRAMS: Record<string, number> = { mg: 0.001, g: 1, kg: 1000 };
// How an ingredient's own measures read ("item" is a piece), singular and plural.
export const MEASURE_LABELS: Record<string, [string, string]> = {
  item: ["piece", "pieces"],
  bunch: ["bunch", "bunches"],
  clove: ["clove", "cloves"],
  stalk: ["stalk", "stalks"],
  sachet: ["sachet", "sachets"],
  tin: ["tin", "tins"],
  cube: ["cube", "cubes"],
};
const MEASURE_PLURALS = new Map(Object.values(MEASURE_LABELS));
// Up to this much over a whole or a half of a sensitive ingredient rounds down.
const COUNTED_SLACK = 0.1;

// Decimal.quantize(0.001, ROUND_HALF_UP), for positive amounts.
const settle = (amount: number) => Math.round(amount * 1000 + 1e-9) / 1000;

// "8 cups", "250 g" or "2 pieces"; null when there's no positive amount. A
// spice measured by volume reads in spoons.
export function shoppingDisplayQuantity(
  amount: number | null,
  unit: string | null,
  ingredientSubcategory?: string | null,
  rule: CountRule = "normal"
) {
  if (amount === null || !(amount > 0)) return null;
  let current: string | null = unit?.trim() || null;
  let value = amount;
  if (current !== null && !(current in UNIT_LABELS)) current = TYPED_UNITS[current.toLowerCase()] ?? current;
  if (ingredientSubcategory && SPOON_SUBCATEGORIES.has(ingredientSubcategory) && current !== null && current in VOLUME_ML) {
    const millilitres = value * VOLUME_ML[current];
    [current, value] = millilitres >= TABLESPOON_ML ? ["tbsp", millilitres / TABLESPOON_ML] : ["tsp", millilitres / TEASPOON_ML];
  }
  [current, value] = smallerUnitBelowOne(current, value);
  [current, value] = biggerUnitFromAThousand(current, value);
  // Pieces, bunches and cubes count by the ingredient's rule; weights and spoons always round up.
  const whole = current === null || current in MEASURE_LABELS ? wholeCount(value, rule) : Math.ceil(settle(value));
  const [label, known] = unitLabel(current);
  return `${whole} ${known && whole !== 1 ? plural(label) : label}`;
}

// A counted amount as people say it (whole_or_half): 1.1 → 1 ½ and 1.6 → 2,
// but 1.6 → 1 ½ for a sensitive ingredient, and 2.4 → 3 eggs.
function wholeOrHalf(amount: number, rule: CountRule = "normal") {
  return counted(amount, rule === "whole" ? 1 : 0.5, rule);
}

// Whole measures to buy (whole_count): 3.05 → 4, but 3 for a sensitive ingredient.
function wholeCount(amount: number, rule: CountRule = "normal") {
  return counted(amount, 1, rule);
}

function counted(amount: number, step: number, rule: CountRule) {
  const settled = settle(amount);
  const slack = rule === "normal" ? 0 : COUNTED_SLACK;
  const below = Math.floor(settled / step + 1e-9) * step;
  const rounded = settled - below <= slack + 1e-9 ? below : below + step;
  return Math.max(rounded, step);
}

// "4 medium pieces" or "1 bunch": whole measures to buy (measure_display_quantity).
export function measureDisplayQuantity(grams: number, unit: string, size: string | null, measureGrams: number, rule: CountRule = "normal") {
  const count = wholeCount(grams / measureGrams, rule);
  const [singular, plural] = MEASURE_LABELS[unit];
  const label = count === 1 ? singular : plural;
  return size ? `${count} ${size} ${label}` : `${count} ${label}`;
}

function smallerUnitBelowOne(unit: string | null, amount: number): [string | null, number] {
  if (unit === null || amount >= 1) return [unit, amount];
  if (unit in SMALLER_UNIT) return [SMALLER_UNIT[unit][0], amount * SMALLER_UNIT[unit][1]];
  if (unit.endsWith("_kg")) return [`${unit.slice(0, -3)}_g`, amount * 1000];
  return [unit, amount];
}

function biggerUnitFromAThousand(unit: string | null, amount: number): [string | null, number] {
  if (unit === null || settle(amount) < 1000) return [unit, amount];
  if (unit in BIGGER_UNIT) return [BIGGER_UNIT[unit][0], amount / BIGGER_UNIT[unit][1]];
  if (unit.endsWith("_g")) return [`${unit.slice(0, -2)}_kg`, amount / 1000];
  return [unit, amount];
}

// The label to show, and whether it's one of ours (so it may take a plural).
function unitLabel(unit: string | null): [string, boolean] {
  if (unit === null) return ["piece", true];
  if (unit in UNIT_LABELS) return [UNIT_LABELS[unit], true];
  if (unit in MEASURE_LABELS) return [MEASURE_LABELS[unit][0], true];
  const suffix = unit.includes("_") ? unit.slice(unit.lastIndexOf("_") + 1) : "";
  if (["mg", "g", "kg", "oz", "lb"].includes(suffix)) return [suffix, true];
  return [unit, false];
}

const plural = (label: string) => (ABBREVIATIONS.has(label) || !/[a-z]$/i.test(label) ? label : (MEASURE_PLURALS.get(label) ?? `${label}s`));

export type UnitRow = {
  id: string;
  baseUnit: string;
  baseFactorMin: string | number;
  baseFactorMax: string | number;
  isApproximate: boolean;
};

const UNIT_ALIASES: Record<string, string> = { ml: "mL", l: "L" };

// An amount in another unit of the same kind, at each unit's midpoint
// factor; null when the units don't share a base.
export function convertQuantity(quantity: number, fromUnit: string, toUnit: string, units: Map<string, UnitRow>) {
  const from = UNIT_ALIASES[fromUnit] ?? fromUnit;
  const to = UNIT_ALIASES[toUnit] ?? toUnit;
  if (from === to) return { quantity, isApproximate: false };
  const fromRow = units.get(from);
  const toRow = units.get(to);
  if (!fromRow || !toRow || fromRow.baseUnit !== toRow.baseUnit) return null;
  const factor = (row: UnitRow) => (Number(row.baseFactorMin) + Number(row.baseFactorMax)) / 2;
  const isApproximate =
    fromRow.isApproximate ||
    toRow.isApproximate ||
    Number(fromRow.baseFactorMin) !== Number(fromRow.baseFactorMax) ||
    Number(toRow.baseFactorMin) !== Number(toRow.baseFactorMax);
  return { quantity: (quantity * factor(fromRow)) / factor(toRow), isApproximate };
}

// What an item's recipes need: "300 g", "0.33 metric cups", "1.5 pieces", or
// "1 metric cup + 250 mL" when the units differ; null when no recipe gave
// an amount (recipe_amount_text).
export function recipeAmountText(sources: { amount: string | null; unit: string | null }[], rule: CountRule = "normal") {
  const totals = new Map<string | null, number>();
  for (const source of sources) {
    if (source.amount !== null) totals.set(source.unit, (totals.get(source.unit) ?? 0) + Number(source.amount));
  }
  const parts = [...totals].map(([unit, amount]) => {
    // Pieces and other counted measures read whole or half ("1.5 pieces").
    const counts = unit === null || unit in MEASURE_LABELS;
    const shown = counts ? wholeOrHalf(amount, rule) : Math.round(amount * 100 + 1e-9) / 100;
    const [label, known] = unitLabel(unit);
    return `${shown} ${known && shown !== 1 ? plural(label) : label}`;
  });
  return parts.join(" + ") || null;
}
