import {
  RecipeInstruction,
  RecipeInstructionQuantitySegment,
  Unit,
} from "../types/api";
import {
  convertQuantity,
  formatConvertedQuantity,
  getUnitDisplayLabel,
  getUnitModeForUnitId,
} from "./unitConversion";
import { formatQuantityText, formatQuantityValue } from "./scaling";

const MAX_DECIMAL_PLACES = 3;

export function formatScaledInstruction({
  instruction,
  baseServings,
  selectedServings,
  unitsById,
  selectedUnitByIngredientId,
}: {
  instruction: RecipeInstruction;
  baseServings: number | null;
  selectedServings: number;
  unitsById: Map<string, Unit>;
  selectedUnitByIngredientId: Map<string, string>;
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
      });
    })
    .join("");
}

export function scaleDecimalString(
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
}: {
  segment: RecipeInstructionQuantitySegment;
  baseServings: number;
  selectedServings: number;
  unitsById: Map<string, Unit>;
  selectedUnitByIngredientId: Map<string, string>;
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
      const mode = getUnitModeForUnitId(converted.unit) ?? "metric";
      const quantity = formatConvertedQuantity(converted.quantity, mode);
      const unitLabel = getInstructionUnitLabel(unitsById, converted.unit);

      return `${converted.isApproximate ? "≈" : ""}${quantity}${
        unitLabel ? ` ${unitLabel}` : ""
      }`;
    }
  }

  if (!segment.unit) {
    return formatQuantityValue(Number(scaledQuantity));
  }

  const unitLabel = getInstructionUnitLabel(unitsById, segment.unit);
  return `${formatQuantityValue(Number(scaledQuantity))}${
    unitLabel ? ` ${unitLabel}` : ""
  }`;
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
