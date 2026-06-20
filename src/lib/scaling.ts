// src/lib/scaling.ts

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

  return Math.round((baseCost * selectedServings) / baseServings);
}

export function scaleAmountText({
  amount,
  baseServings,
  selectedServings,
}: {
  amount: string;
  baseServings: number;
  selectedServings: number;
}) {
  const normalizedAmount = amount.trim();

  if (shouldSkipScaling(normalizedAmount)) {
    return normalizedAmount;
  }

  const factor = selectedServings / baseServings;

  return normalizedAmount.replace(
    /(\d+\.\d+|\d+\/\d+|\d+|½|⅓|⅔|¼|¾|⅛|⅜|⅝|⅞)/g,
    (match) => {
      const numericValue = parseQuantity(match);

      if (numericValue === null) {
        return match;
      }

      const scaledValue = numericValue * factor;

      return formatScaledQuantity(scaledValue);
    }
  );
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

function parseQuantity(value: string) {
  const vulgarFractions: Record<string, number> = {
    "½": 1 / 2,
    "⅓": 1 / 3,
    "⅔": 2 / 3,
    "¼": 1 / 4,
    "¾": 3 / 4,
    "⅛": 1 / 8,
    "⅜": 3 / 8,
    "⅝": 5 / 8,
    "⅞": 7 / 8,
  };

  if (value in vulgarFractions) {
    return vulgarFractions[value];
  }

  if (value.includes("/")) {
    const [numerator, denominator] = value.split("/").map(Number);

    if (!numerator || !denominator) {
      return null;
    }

    return numerator / denominator;
  }

  const parsed = Number(value);

  return Number.isNaN(parsed) ? null : parsed;
}

function formatScaledQuantity(value: number) {
  const rounded = Math.round(value * 4) / 4;

  if (Number.isInteger(rounded)) {
    return String(rounded);
  }

  const whole = Math.floor(rounded);
  const fraction = rounded - whole;

  const fractionMap: Record<number, string> = {
    0.25: "¼",
    0.5: "½",
    0.75: "¾",
  };

  const fractionText = fractionMap[fraction];

  if (!fractionText) {
    return String(Number(rounded.toFixed(2)));
  }

  if (whole === 0) {
    return fractionText;
  }

  return `${whole}${fractionText}`;
}
