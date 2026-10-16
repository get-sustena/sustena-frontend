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

export function isBelowPinch(baseQuantity: number, baseUnit: string) {
  if (baseUnit === "mL") return baseQuantity < PINCH_BELOW_ML;
  if (baseUnit === "g") return baseQuantity < PINCH_BELOW_G;
  return false;
}

// The number to show for an amount in this unit: grams and millilitres
// whole, kilos and litres in quarters, everything else in kitchen fractions.
export function friendlyQuantity(value: number, unitId: string) {
  const id = unitId.toLowerCase();

  if (WHOLE_UNITS.test(id)) {
    return String(Math.max(1, Math.round(value)));
  }

  if (id === "item") {
    return friendlyCount(value, { whole: false });
  }

  return friendlyNumber(
    value,
    QUARTER_UNITS.test(id) ? QUARTER_STEPS : value >= 10 ? HALF_STEPS : KITCHEN_STEPS,
    id === "tsp"
  );
}

// Counted items show whole or with a half, never 1.364 (founder, 2026-10-16):
// up to 0.1 over a whole or a half rounds down, anything more rounds up to
// the next half. Eggs round up to the next whole egg instead. Never below ½.
export function friendlyCount(value: number, { whole }: { whole: boolean }) {
  const step = whole ? 1 : 0.5;
  const steps = Math.floor(value / step + 1e-9);
  const over = value - steps * step;
  const rounded = (over <= COUNT_ROUND_DOWN + 1e-9 ? steps : steps + 1) * step;
  const shown = Math.max(step, rounded);
  const wholes = Math.floor(shown);

  if (shown === wholes) return String(wholes);
  return wholes === 0 ? "½" : `${wholes} ½`;
}

export function countsInWholes(ingredientId: string | null | undefined) {
  return Boolean(ingredientId && WHOLE_ITEM_INGREDIENT_IDS.has(ingredientId));
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
