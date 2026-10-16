import type {
  RecipeInstruction,
  RecipeInstructionQuantitySegment,
  RecipeLineMeasure,
  Unit,
} from "../types/api.ts";
import { friendlyCount, type CountRule } from "./friendlyAmounts.ts";
import { measureAmountText } from "./measures.ts";
import {
  convertQuantity,
  formatAmountInUnit,
  getUnitDisplayLabel,
} from "./unitConversion.ts";
import { formatQuantityText } from "./scaling.ts";

const MAX_DECIMAL_PLACES = 3;

export function formatScaledInstruction({
  instruction,
  baseServings,
  selectedServings,
  unitsById,
  selectedUnitByIngredientId,
  countRuleByIngredientId = new Map(),
  measureByIngredientId = new Map(),
}: {
  instruction: RecipeInstruction;
  baseServings: number | null;
  selectedServings: number;
  unitsById: Map<string, Unit>;
  selectedUnitByIngredientId: Map<string, string>;
  // How each recipe ingredient's count rounds (see countRuleFor).
  countRuleByIngredientId?: Map<string, CountRule>;
  // Lines shown in pieces, cloves or bunches (P-17); their steps read the same.
  measureByIngredientId?: Map<string, LineMeasure>;
}) {
  if (
    !instruction.segments?.length ||
    !baseServings ||
    baseServings <= 0
  ) {
    return instruction.text;
  }

  return instruction.segments
    .map((segment) => {
      if (segment.type === "text") {
        return segment.text;
      }

      if (segment.scalesWithServings !== true) {
        return segment.text;
      }

      return formatQuantitySegment({
        segment,
        baseServings,
        selectedServings,
        unitsById,
        selectedUnitByIngredientId,
        countRuleByIngredientId,
        measureByIngredientId,
      });
    })
    .join("");
}

// A recipe line's amount, with the share of its measure it comes to.
type LineMeasure = { measure: RecipeLineMeasure; quantity: number; unit: string | null };

// The step's amount in the line's measure ("1 ½ pieces"): its share of the
// line, so a step that uses half the onion reads half of it. Null keeps the
// step's own amount (another unit, or too small a share to count).
function measureSegmentText(
  segment: RecipeInstructionQuantitySegment,
  line: LineMeasure | undefined,
  servingFactor: number,
  countRule: CountRule
) {
  if (!line || !(line.quantity > 0) || segment.unit !== line.unit) return null;
  const share = (Number(segment.baseQuantity) / line.quantity) * Number(line.measure.exactQuantity);
  return measureAmountText({ ...line.measure, exactQuantity: String(share) }, servingFactor, countRule);
}

function scaleDecimalString(
  baseQuantity: string,
  selectedServings: number,
  baseServings: number
) {
  const parsed = parseDecimalString(baseQuantity);

  if (
    !parsed ||
    !Number.isSafeInteger(selectedServings) ||
    selectedServings <= 0 ||
    !Number.isSafeInteger(baseServings) ||
    baseServings <= 0
  ) {
    return null;
  }

  const numerator = parsed.value * BigInt(selectedServings);
  const denominator = 10n ** BigInt(parsed.scale) * BigInt(baseServings);
  const displayScale = 10n ** BigInt(MAX_DECIMAL_PLACES);
  const rounded = (numerator * displayScale + denominator / 2n) / denominator;
  const whole = rounded / displayScale;
  const fraction = String(rounded % displayScale)
    .padStart(MAX_DECIMAL_PLACES, "0")
    .replace(/0+$/, "");

  return fraction ? `${whole}.${fraction}` : String(whole);
}

function formatQuantitySegment({
  segment,
  baseServings,
  selectedServings,
  unitsById,
  selectedUnitByIngredientId,
  countRuleByIngredientId,
  measureByIngredientId,
}: {
  segment: RecipeInstructionQuantitySegment;
  baseServings: number;
  selectedServings: number;
  unitsById: Map<string, Unit>;
  selectedUnitByIngredientId: Map<string, string>;
  countRuleByIngredientId: Map<string, CountRule>;
  measureByIngredientId: Map<string, LineMeasure>;
}) {
  const scaledQuantity = scaleDecimalString(
    segment.baseQuantity,
    selectedServings,
    baseServings
  );

  if (scaledQuantity === null) {
    return segment.text;
  }

  const selectedUnit = segment.recipeIngredientId
    ? selectedUnitByIngredientId.get(segment.recipeIngredientId)
    : undefined;
  const countRule = (segment.recipeIngredientId && countRuleByIngredientId.get(segment.recipeIngredientId)) || "normal";
  const inMeasure = measureSegmentText(
    segment,
    segment.recipeIngredientId ? measureByIngredientId.get(segment.recipeIngredientId) : undefined,
    selectedServings / baseServings,
    countRule
  );

  if (inMeasure) {
    return inMeasure;
  }

  if (
    selectedServings === baseServings &&
    (!selectedUnit || selectedUnit === segment.unit)
  ) {
    return formatQuantityText(segment.text);
  }

  if (segment.unit && selectedUnit && selectedUnit !== segment.unit) {
    const converted = convertQuantity({
      unitsById,
      quantity: Number(scaledQuantity),
      fromUnit: segment.unit,
      toUnit: selectedUnit,
    });

    if (converted) {
      return formatAmountInUnit(
        unitsById,
        converted,
        getInstructionUnitLabel(unitsById, converted.unit),
        countRule
      );
    }
  }

  if (!segment.unit || segment.unit.trim().toLowerCase() === "item") {
    return friendlyCount(Number(scaledQuantity), countRule);
  }

  return formatAmountInUnit(
    unitsById,
    { quantity: Number(scaledQuantity), unit: segment.unit, isApproximate: false },
    getInstructionUnitLabel(unitsById, segment.unit),
    countRule
  );
}

function getInstructionUnitLabel(unitsById: Map<string, Unit>, unit: string) {
  return unit.trim().toLowerCase() === "item"
    ? ""
    : getUnitDisplayLabel(unitsById, unit);
}

function parseDecimalString(value: string) {
  const match = value.trim().match(/^(\d+)(?:\.(\d+))?$/);

  if (!match) {
    return null;
  }

  const fraction = match[2] ?? "";
  const unscaled = `${match[1]}${fraction}`.replace(/^0+(?=\d)/, "");

  return {
    value: BigInt(unscaled || "0"),
    scale: fraction.length,
  };
}
