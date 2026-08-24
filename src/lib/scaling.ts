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
    return formatQuantityText(normalizedAmount);
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

const COMMON_FRACTIONS = [
  { value: 1 / 8, label: "1/8" },
  { value: 1 / 6, label: "1/6" },
  { value: 1 / 4, label: "1/4" },
  { value: 1 / 3, label: "1/3" },
  { value: 3 / 8, label: "3/8" },
  { value: 1 / 2, label: "1/2" },
  { value: 5 / 8, label: "5/8" },
  { value: 2 / 3, label: "2/3" },
  { value: 3 / 4, label: "3/4" },
  { value: 5 / 6, label: "5/6" },
  { value: 7 / 8, label: "7/8" },
] as const;

const FRACTION_TOLERANCE = 0.012;

export function formatQuantityText(value: string) {
  return value
    .replace(/(\d)(½|⅓|⅔|¼|¾|⅛|⅜|⅝|⅞)/g, "$1 $2")
    .replace(NUMERIC_TOKEN_PATTERN_GLOBAL, (token) => {
      const quantity = parseQuantityToken(token);
      return quantity === null ? token : formatQuantityValue(quantity);
    });
}

export function formatQuantityValue(value: number) {
  if (!Number.isFinite(value) || value <= 0) {
    return "0";
  }

  const nearestInteger = Math.round(value);
  if (
    nearestInteger > 0 &&
    Math.abs(value - nearestInteger) <= FRACTION_TOLERANCE
  ) {
    return String(nearestInteger);
  }

  const whole = Math.floor(value);
  const remainder = value - whole;
  const fraction = COMMON_FRACTIONS.reduce((nearest, candidate) =>
    Math.abs(candidate.value - remainder) <
    Math.abs(nearest.value - remainder)
      ? candidate
      : nearest
  );

  if (Math.abs(fraction.value - remainder) > FRACTION_TOLERANCE) {
    const decimalPlaces = value < 1 ? 3 : 2;
    return String(Number(value.toFixed(decimalPlaces)));
  }

  if (whole === 0) {
    return fraction.label;
  }

  return `${whole} ${fraction.label}`;
}
