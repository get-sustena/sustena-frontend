// src/lib/scaling.ts

import {
  NUMERIC_TOKEN_PATTERN_GLOBAL,
  parseQuantityToken,
} from "./quantityParsing";

export function scaleCost({
  baseCost,
  baseServings,
  selectedServings,
}: {
  baseCost: number | null;
  baseServings: number;
  selectedServings: number;
}) {
  if (baseCost === null) {
    return null;
  }

  return Math.round((baseCost * selectedServings) / getSafeBaseServings(baseServings));
}

export function scaleAmountText({
  amount,
  baseServings,
  selectedServings,
}: {
  amount: string | null | undefined;
  baseServings: number;
  selectedServings: number;
}) {
  if (!amount) {
    return "";
  }

  const normalizedAmount = amount.trim();

  if (shouldSkipScaling(normalizedAmount)) {
    return normalizedAmount;
  }

  const factor = selectedServings / getSafeBaseServings(baseServings);

  return normalizedAmount.replace(NUMERIC_TOKEN_PATTERN_GLOBAL, (match) => {
    const numericValue = parseQuantityToken(match);

    if (numericValue === null) {
      return match;
    }

    const scaledValue = numericValue * factor;

    return formatQuantityValue(scaledValue);
  });
}

function getSafeBaseServings(baseServings: number) {
  return Number.isFinite(baseServings) && baseServings > 0 ? baseServings : 1;
}

function shouldSkipScaling(amount: string) {
  const lower = amount.toLowerCase();

  return (
    lower.includes("taste") ||
    lower.includes("handful") ||
    lower.includes("pinch") ||
    lower.includes("as needed") ||
    lower.includes("optional") ||
    lower.includes("~")
  );
}

const FRACTION_MAP: Record<number, string> = {
  0.125: "⅛",
  0.25: "¼",
  0.375: "⅜",
  0.5: "½",
  0.625: "⅝",
  0.75: "¾",
  0.875: "⅞",
};

export function formatQuantityValue(value: number) {
  if (!Number.isFinite(value) || value <= 0) {
    return "0";
  }

  const rounded = Math.round(value * 8) / 8;
  // Never collapse a nonzero quantity down to "0" — floor at the smallest
  // displayable fraction instead of silently dropping the ingredient.
  const clamped = rounded === 0 ? 0.125 : rounded;

  if (Number.isInteger(clamped)) {
    return String(clamped);
  }

  const whole = Math.floor(clamped);
  const fraction = clamped - whole;
  const fractionText = FRACTION_MAP[fraction];

  if (!fractionText) {
    return String(Number(clamped.toFixed(2)));
  }

  if (whole === 0) {
    return fractionText;
  }

  return `${whole}${fractionText}`;
}
