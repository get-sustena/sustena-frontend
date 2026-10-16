// Amounts the way people cook (founder, 2026-10-16): whole grams and
// millilitres, kitchen fractions for spoons, cups and pieces, and "a pinch"
// for tiny amounts. Display only: nutrition and cost keep counting in grams.

export const PINCH = "a pinch";

// Below ⅛ tsp of a liquid, or half a gram of something dry, is a pinch.
const PINCH_BELOW_ML = 5 / 8;
const PINCH_BELOW_G = 0.5;
const COUNT_ROUND_DOWN = 0.1;

const GLYPHS = new Map([
  [1 / 8, "⅛"],
  [1 / 4, "¼"],
  [1 / 3, "⅓"],
  [1 / 2, "½"],
  [2 / 3, "⅔"],
  [3 / 4, "¾"],
]);
const KITCHEN_STEPS = [1 / 4, 1 / 3, 1 / 2, 2 / 3, 3 / 4];
const QUARTER_STEPS = [1 / 4, 1 / 2, 3 / 4];
const HALF_STEPS = [1 / 2];

const WHOLE_UNITS = /^(mg|g|ml|cl)$|_(mg|g)$/;
const QUARTER_UNITS = /^(kg|l|dl|lb)$|_(kg|lb)$/;

// Eggs are cooked whole, so they never show as ½ an egg.
const WHOLE_ITEM_INGREDIENT_IDS = new Set(["egg", "duck-egg", "quail-egg"]);

// Strong ingredients, where a little too much spoils the dish: their counts
// round down when only a little over (founder, 2026-10-16). Whole catalogue
// subcategories, plus the hot peppers from "Pepper", which also holds bell
// peppers. The same lists as the server's count_rule, for a catalogue saved
// before ingredients carried countRule; goes once the live API sends it.
const SENSITIVE_SUBCATEGORIES = new Set([
  "Alkaline ingredient",
  "Basic seasoning",
  "Seasoning",
  "Pepper spice",
  "Spice",
  "Spice blend",
  "Nigerian spice blend",
  "Drink spice blend",
  "Dried spice",
  "Seed spice",
  "Bark spice",
  "Berry spice",
  "Flower spice",
  "Pod spice",
  "West African spice",
  "Dried herb",
  "Fermented seasoning",
  "Raising agent",
  "Yeast",
]);
const SENSITIVE_INGREDIENT_IDS = new Set(["scotch-bonnet-pepper", "chilli-pepper", "cayenne-pepper", "shombo-pepper"]);

// How a counted ingredient rounds: most go up to the next half (1.6 → 2),
// sensitive ones go down when 0.1 or less over (1.6 → 1 ½), eggs go whole.
export type CountRule = "normal" | "sensitive" | "whole";

export function isBelowPinch(baseQuantity: number, baseUnit: string) {
  if (baseUnit === "mL") return baseQuantity < PINCH_BELOW_ML;
  if (baseUnit === "g") return baseQuantity < PINCH_BELOW_G;
  return false;
}

// The number to show for an amount in this unit: grams and millilitres
// whole, kilos and litres in quarters, everything else in kitchen fractions.
export function friendlyQuantity(value: number, unitId: string, countRule: CountRule = "normal") {
  const id = unitId.toLowerCase();

  if (WHOLE_UNITS.test(id)) {
    return String(Math.max(1, Math.round(value)));
  }

  if (id === "item") {
    return friendlyCount(value, countRule);
  }

  return friendlyNumber(
    value,
    QUARTER_UNITS.test(id) ? QUARTER_STEPS : value >= 10 ? HALF_STEPS : KITCHEN_STEPS,
    id === "tsp"
  );
}

// Counted items show whole or with a half, never 1.364 (founder, 2026-10-16).
// Never below ½, or one whole egg.
export function friendlyCount(value: number, rule: CountRule) {
  const step = rule === "whole" ? 1 : 0.5;
  const roundDownWithin = rule === "normal" ? 0 : COUNT_ROUND_DOWN;
  const steps = Math.floor(value / step + 1e-9);
  const over = value - steps * step;
  const rounded = (over <= roundDownWithin + 1e-9 ? steps : steps + 1) * step;
  const shown = Math.max(step, rounded);
  const wholes = Math.floor(shown);

  if (shown === wholes) return String(wholes);
  return wholes === 0 ? "½" : `${wholes} ½`;
}

export function countRuleFor(
  ingredient: { id: string; subcategory: string | null; countRule?: CountRule } | undefined
): CountRule {
  if (!ingredient) return "normal";
  if (ingredient.countRule) return ingredient.countRule;
  if (WHOLE_ITEM_INGREDIENT_IDS.has(ingredient.id)) return "whole";
  if (SENSITIVE_INGREDIENT_IDS.has(ingredient.id)) return "sensitive";
  return ingredient.subcategory && SENSITIVE_SUBCATEGORIES.has(ingredient.subcategory) ? "sensitive" : "normal";
}

function friendlyNumber(value: number, steps: number[], allowEighth: boolean) {
  const whole = Math.floor(value);
  const fractions = whole === 0 && allowEighth ? [1 / 8, ...steps] : steps;
  const candidates = [
    { whole, step: 0 },
    ...fractions.map((step) => ({ whole, step })),
    { whole: whole + 1, step: 0 },
  ].filter((candidate) => candidate.whole + candidate.step > 0);
  const distance = (candidate: { whole: number; step: number }) =>
    Math.abs(candidate.whole + candidate.step - value);
  const nearest = candidates.reduce((best, candidate) =>
    distance(candidate) < distance(best) ? candidate : best
  );
  const glyph = GLYPHS.get(nearest.step);

  if (!glyph) return String(nearest.whole);
  return nearest.whole === 0 ? glyph : `${nearest.whole} ${glyph}`;
}
