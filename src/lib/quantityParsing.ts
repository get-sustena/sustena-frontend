// src/lib/quantityParsing.ts

const VULGAR_FRACTIONS: Record<string, number> = {
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

const VULGAR_FRACTION_SOURCE = "½|⅓|⅔|¼|¾|⅛|⅜|⅝|⅞";
const NUMERIC_TOKEN_SOURCE =
  `(\\d+\\s+\\d+\\/\\d+|\\d+(?:${VULGAR_FRACTION_SOURCE})|` +
  `\\d+\\s+(?:${VULGAR_FRACTION_SOURCE})|\\d+\\.\\d+|\\d+\\/\\d+|` +
  `\\d+|${VULGAR_FRACTION_SOURCE})`;

export const NUMERIC_TOKEN_PATTERN = new RegExp(NUMERIC_TOKEN_SOURCE);
export const NUMERIC_TOKEN_PATTERN_GLOBAL = new RegExp(
  NUMERIC_TOKEN_SOURCE,
  "g"
);

export function parseQuantityToken(token: string): number | null {
  const normalized = token.trim();

  if (normalized in VULGAR_FRACTIONS) {
    return VULGAR_FRACTIONS[normalized];
  }

  const vulgarMixedNumber = normalized.match(
    /^(\d+)\s*(½|⅓|⅔|¼|¾|⅛|⅜|⅝|⅞)$/
  );
  if (vulgarMixedNumber) {
    return (
      Number(vulgarMixedNumber[1]) +
      VULGAR_FRACTIONS[vulgarMixedNumber[2]]
    );
  }

  const asciiMixedNumber = normalized.match(/^(\d+)\s+(\d+)\/(\d+)$/);
  if (asciiMixedNumber) {
    const denominator = Number(asciiMixedNumber[3]);
    if (!denominator) {
      return null;
    }
    return (
      Number(asciiMixedNumber[1]) +
      Number(asciiMixedNumber[2]) / denominator
    );
  }

  if (normalized.includes("/")) {
    const [numerator, denominator] = normalized.split("/").map(Number);

    if (!numerator || !denominator) {
      return null;
    }

    return numerator / denominator;
  }

  const parsed = Number(normalized);

  return Number.isNaN(parsed) ? null : parsed;
}

export function extractLeadingQuantity(
  text: string
): { value: number; unit: string } | null {
  const trimmed = text.trim();
  const match = trimmed.match(NUMERIC_TOKEN_PATTERN);

  if (!match || match.index !== 0) {
    return null;
  }

  const value = parseQuantityToken(match[0]);

  if (value === null) {
    return null;
  }

  return {
    value,
    unit: trimmed.slice(match[0].length).trim(),
  };
}
