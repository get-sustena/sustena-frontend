// Shared by the app and its tests, so nothing here imports React Native.
import type { NutrientValues, RecipeIngredient } from "../../types/api";

// Nutrition on recipes (PRD v6.8 section 15). The backend sends each
// ingredient line's values for the recipe's base servings and the recipe's
// values for 1 serving; everything on screen is worked out from those.

export type NutrientKey = keyof NutrientValues;

// A day, as the app's daily values.
export const DAILY_VALUES: NutrientValues = {
  kcal: 2000,
  proteinG: 50,
  carbsG: 275,
  fatG: 78,
  fibreG: 28,
  saturatedFatG: 20,
  sodiumMg: 2300,
  vitaminCMg: 90,
};

export type NutritionIngredient = Pick<
  RecipeIngredient,
  | "id"
  | "ingredientId"
  | "ingredientName"
  | "canonicalIngredientName"
  | "rawText"
  | "nutrition"
  | "isFryingOil"
  | "quantityMode"
>;

const wholeNumber = new Intl.NumberFormat("en-GB", { maximumFractionDigits: 0 });

// "1,240".
export function formatWhole(value: number) {
  return wholeNumber.format(Math.round(value));
}

// Small amounts keep one decimal ("2.5 g"); calories never do.
export function formatNutrient(value: number, key: NutrientKey) {
  return value > 0 && value < 10 && key !== "kcal"
    ? String(Math.round(value * 10) / 10)
    : formatWhole(value);
}

function ingredientName(ingredient: NutritionIngredient) {
  return ingredient.ingredientName ?? ingredient.canonicalIngredientName ?? ingredient.rawText;
}

function total(ingredients: NutritionIngredient[], key: NutrientKey) {
  return ingredients.reduce((sum, ingredient) => sum + (ingredient.nutrition?.[key] ?? 0), 0);
}

// The word people use for each share. Sodium is called salt.
const SHARE_WORDS: [NutrientKey, string][] = [
  ["proteinG", "protein"],
  ["carbsG", "carbs"],
  ["fatG", "fat"],
  ["vitaminCMg", "vitamin C"],
  ["sodiumMg", "salt"],
];

export type IngredientCalories = { kcal: number; share: string | null };

// The line under an ingredient: the calories in the amount on its pill, so
// it follows the serving picker, and its biggest share of something when
// that's 40% or more ("most of the carbs", "about half the fat"). An
// ingredient with nothing to count, such as salt to taste or water, gets no
// line (founder, 14 October 2026).
export function ingredientCalories(
  ingredient: NutritionIngredient,
  ingredients: NutritionIngredient[],
  servings: number,
  baseServings: number
): IngredientCalories | null {
  const values = ingredient.nutrition;
  if (!values) return null;

  const kcal = (values.kcal * servings) / baseServings;
  if (ingredient.isFryingOil) return { kcal, share: "only what soaks in" };
  if (Math.round(kcal) === 0) return null;

  let best: { word: string; share: number } | null = null;
  for (const [key, word] of SHARE_WORDS) {
    const recipeTotal = total(ingredients, key);
    const share = recipeTotal ? values[key] / recipeTotal : 0;
    if (share >= 0.4 && (!best || share > best.share)) best = { word, share };
  }
  const share = best ? `${best.share >= 0.5 ? "most of the" : "about half the"} ${best.word}` : null;
  return { kcal, share };
}

// "Lighter: using half the oil cuts about 100 kcal from each serving." on the
// first step that mentions oil, when that saves 40 kcal or more a serving.
// Deep-frying oil never gets it.
export function oilTip(
  ingredients: NutritionIngredient[],
  stepTexts: string[],
  baseServings: number
): { step: number; saveKcal: number } | null {
  const oilKcal = ingredients
    .filter(
      (ingredient) =>
        /(^|-)oil$/.test(ingredient.ingredientId ?? "") && !ingredient.isFryingOil && ingredient.nutrition
    )
    .reduce((sum, ingredient) => sum + (ingredient.nutrition?.kcal ?? 0), 0);
  const save = oilKcal / baseServings / 2;
  if (save < 40) return null;

  const step = stepTexts.findIndex((text) => /\boil\b/i.test(text));
  return step < 0 ? null : { step, saveKcal: Math.round(save / 10) * 10 };
}

// ---- The nutrition page. 1 plate is 1 serving. ----

export const PLATES = [
  { amount: 0.5, label: "½ plate", pictures: [0.5] },
  { amount: 1, label: "1 plate", pictures: [1] },
  { amount: 1.5, label: "1½ plates", pictures: [1, 0.5] },
  { amount: 2, label: "2 plates", pictures: [1, 1] },
] as const;

// Calories are rounded per plate first, so 2 plates reads as exactly twice 1.
export function amountFor(perServing: NutrientValues, key: NutrientKey, plates: number) {
  return (key === "kcal" ? Math.round(perServing.kcal) : perServing[key]) * plates;
}

export function dayShare(amount: number, key: NutrientKey) {
  return Math.round((amount / DAILY_VALUES[key]) * 100);
}

// Breakfast, lunch and dinner bars of 667 kcal each, filled in order.
export function mealFills(kcal: number) {
  const meal = DAILY_VALUES.kcal / 3;
  return [0, 1, 2].map((index) =>
    Math.round(Math.max(0, Math.min(1, (kcal - index * meal) / meal)) * 100)
  );
}

export type NutrientSource = {
  label: string;
  ingredient: NutritionIngredient | null;
  perServing: number;
};

// A macro's three biggest sources for 1 serving, then the rest as "Others".
export function macroSources(
  ingredients: NutritionIngredient[],
  key: NutrientKey,
  baseServings: number
): NutrientSource[] {
  const list = ingredients
    .filter((ingredient) => (ingredient.nutrition?.[key] ?? 0) > 0)
    .sort((left, right) => (right.nutrition?.[key] ?? 0) - (left.nutrition?.[key] ?? 0));
  const top = list.slice(0, 3).map((ingredient) => ({
    label: ingredientName(ingredient),
    ingredient,
    perServing: (ingredient.nutrition?.[key] ?? 0) / baseServings,
  }));
  const rest = list.slice(3);
  return rest.length
    ? [...top, { label: "Others", ingredient: null, perServing: total(rest, key) / baseServings }]
    : top;
}

export type OtherNutrient = {
  key: NutrientKey;
  name: string;
  unit: string;
  amount: number;
  share: number;
  tag: "good" | "watch" | null;
};

// Vitamin C and fibre are "Good" from 15% of a day; saturated fat and sodium
// are "Go easy" above 30%. Anything else gets no tag.
export function otherNutrients(perServing: NutrientValues, plates: number): OtherNutrient[] {
  const rows: { key: NutrientKey; name: string; unit: string; watch: boolean }[] = [
    { key: "vitaminCMg", name: "Vitamin C", unit: "mg", watch: false },
    { key: "fibreG", name: "Fibre", unit: "g", watch: false },
    { key: "saturatedFatG", name: "Saturated fat", unit: "g", watch: true },
    { key: "sodiumMg", name: "Sodium", unit: "mg", watch: true },
  ];
  return rows.map(({ key, name, unit, watch }) => {
    const amount = amountFor(perServing, key, plates);
    const share = dayShare(amount, key);
    const tag = watch ? (share > 30 ? "watch" : null) : share >= 15 ? "good" : null;
    return { key, name, unit, amount, share, tag };
  });
}

// "Estimates." with what isn't counted, and a note when the recipe deep-fries.
// "To taste" lines, such as salt, add nothing to count, so they aren't named.
export function nutritionFootnote(ingredients: NutritionIngredient[]) {
  const skipped = [
    ...new Set(
      ingredients
        .filter((ingredient) => !ingredient.nutrition && ingredient.quantityMode !== "to_taste")
        .map((ingredient) => ingredientName(ingredient).toLowerCase())
    ),
  ];
  return (
    "Estimates." +
    (skipped.length ? ` Not counted: ${skipped.join(", ")}.` : "") +
    (ingredients.some((ingredient) => ingredient.isFryingOil) ? " Frying oil counts only what the food soaks up." : "")
  );
}
