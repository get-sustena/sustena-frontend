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

const NUMERIC_TOKEN_SOURCE =
  "(\\d+\\.\\d+|\\d+\\/\\d+|\\d+|½|⅓|⅔|¼|¾|⅛|⅜|⅝|⅞)";

export const NUMERIC_TOKEN_PATTERN = new RegExp(NUMERIC_TOKEN_SOURCE);
export const NUMERIC_TOKEN_PATTERN_GLOBAL = new RegExp(
  NUMERIC_TOKEN_SOURCE,
  "g"
);

export function parseQuantityToken(token: string): number | null {
  if (token in VULGAR_FRACTIONS) {
    return VULGAR_FRACTIONS[token];
  }

  if (token.includes("/")) {
    const [numerator, denominator] = token.split("/").map(Number);

    if (!numerator || !denominator) {
      return null;
    }

    return numerator / denominator;
  }

  const parsed = Number(token);

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
