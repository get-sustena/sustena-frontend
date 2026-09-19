const UNICODE_FRACTIONS: Record<string, number> = {
  "¼": 0.25,
  "½": 0.5,
  "¾": 0.75,
  "⅓": 1 / 3,
  "⅔": 2 / 3,
  "⅛": 0.125,
  "⅜": 0.375,
  "⅝": 0.625,
  "⅞": 0.875,
};

export type StructuredShoppingQuantity = {
  quantity: string;
  amount: number | null;
  displayQuantity: string;
  unit: string | null;
};

export function structureShoppingQuantity(
  quantityText: string,
  explicitUnit?: string | null
): StructuredShoppingQuantity {
  const raw = quantityText.trim();
  const requestedUnit = explicitUnit?.trim() || null;
  const parsed = parseLeadingAmount(raw);
  const detectedUnit = parsed?.remainder.trim() || null;
  const unit = requestedUnit ?? detectedUnit;
  const displayQuantity = buildDisplayQuantity(raw, requestedUnit, detectedUnit);

  return {
    quantity: raw,
    amount: parsed?.amount ?? null,
    displayQuantity,
    unit,
  };
}

function parseLeadingAmount(value: string) {
  const unicodeMixed = value.match(/^(\d+)\s*([¼½¾⅓⅔⅛⅜⅝⅞])(?:\s+|$)(.*)$/u);
  if (unicodeMixed) {
    return {
      amount: Number(unicodeMixed[1]) + UNICODE_FRACTIONS[unicodeMixed[2]],
      remainder: unicodeMixed[3],
    };
  }
  const unicode = value.match(/^([¼½¾⅓⅔⅛⅜⅝⅞])(?:\s+|$)(.*)$/u);
  if (unicode) {
    return { amount: UNICODE_FRACTIONS[unicode[1]], remainder: unicode[2] };
  }
  const mixed = value.match(/^(\d+)\s+(\d+)\/(\d+)(?:\s+|$)(.*)$/);
  if (mixed && Number(mixed[3]) !== 0) {
    return {
      amount: Number(mixed[1]) + Number(mixed[2]) / Number(mixed[3]),
      remainder: mixed[4],
    };
  }
  const fraction = value.match(/^(\d+)\/(\d+)(?:\s+|$)(.*)$/);
  if (fraction && Number(fraction[2]) !== 0) {
    return {
      amount: Number(fraction[1]) / Number(fraction[2]),
      remainder: fraction[3],
    };
  }
  const decimal = value.match(/^((?:\d+(?:\.\d+)?|\.\d+))(?:\s+|$)(.*)$/);
  if (decimal) {
    return { amount: Number(decimal[1]), remainder: decimal[2] };
  }
  return null;
}

function buildDisplayQuantity(
  raw: string,
  requestedUnit: string | null,
  detectedUnit: string | null
) {
  if (!requestedUnit || detectedUnit) return raw;
  return `${raw} ${requestedUnit}`.trim();
}
