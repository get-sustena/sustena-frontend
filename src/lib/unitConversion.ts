// Conversion requires a shared base unit; context only limits which units are offered.

import type { Ingredient, IngredientConversionContext, Unit } from "../types/api.ts";
import { friendlyQuantity, isBelowPinch, PINCH, tooSmallForUnit, type CountRule } from "./friendlyAmounts.ts";

export type UnitMode = "metric" | "cups" | "imperial";

// A milk cup or derica shows only from half a cup up (founder, 2026-10-16).
const MIN_NIGERIAN_CUPS = 0.5;
// Under a quarter cup, metric volumes read in spoons: "½ tsp", not "3 mL"
// (founder, 2026-10-16).
const METRIC_SPOONS_BELOW_ML = 60;

interface ConvertedQuantity {
  quantity: number;
  unit: string;
  isApproximate: boolean;
}

interface ScaleUnitOption extends ConvertedQuantity {
  label: string;
  preview: string;
}

interface ContextUnitMap {
  metricSmall: string | null;
  metricLarge: string | null;
  nigerianDefault: string | null;
  imperialSmall: string | null;
  imperialLarge: string | null;
}

// Do not infer Nigerian measures without ingredient-specific density data.
const CONTEXT_UNITS: Record<IngredientConversionContext, ContextUnitMap> = {
  mass: {
    metricSmall: "g",
    metricLarge: "kg",
    nigerianDefault: null,
    imperialSmall: "oz",
    imperialLarge: "lb",
  },
  volume: {
    metricSmall: "mL",
    metricLarge: "L",
    nigerianDefault: "milk_cup",
    imperialSmall: "us_floz",
    imperialLarge: "us_cup",
  },
  rice: {
    metricSmall: "rice_g",
    metricLarge: "rice_kg",
    nigerianDefault: "rice_derica_small",
    imperialSmall: "rice_oz",
    imperialLarge: "rice_lb",
  },
  plain_flour: {
    metricSmall: "flour_g",
    metricLarge: "flour_kg",
    nigerianDefault: "flour_milk_cup",
    imperialSmall: "flour_oz",
    imperialLarge: "flour_lb",
  },
  millet: {
    metricSmall: "millet_g",
    metricLarge: "millet_kg",
    nigerianDefault: "millet_milk_cup",
    imperialSmall: "millet_oz",
    imperialLarge: "millet_lb",
  },
  sorghum: {
    metricSmall: "sorghum_g",
    metricLarge: "sorghum_kg",
    nigerianDefault: "sorghum_milk_cup",
    imperialSmall: "sorghum_oz",
    imperialLarge: "sorghum_lb",
  },
  seasoning_cube: {
    metricSmall: "cube",
    metricLarge: null,
    nigerianDefault: null,
    imperialSmall: "oz",
    imperialLarge: "lb",
  },
  count: {
    metricSmall: null,
    metricLarge: null,
    nigerianDefault: null,
    imperialSmall: null,
    imperialLarge: null,
  },
};

export function buildUnitLookup(units: Unit[]): Map<string, Unit> {
  return new Map(units.map((unit) => [unit.id, unit]));
}

export function buildIngredientLookup(
  ingredients: Ingredient[]
): Map<string, Ingredient> {
  return new Map(ingredients.map((ingredient) => [ingredient.id, ingredient]));
}

export function convertQuantity({
  unitsById,
  quantity,
  fromUnit,
  toUnit,
}: {
  unitsById: Map<string, Unit>;
  quantity: number;
  fromUnit: string;
  toUnit: string;
}): ConvertedQuantity | null {
  if (fromUnit === toUnit) {
    return { quantity, unit: toUnit, isApproximate: false };
  }

  const from = unitsById.get(fromUnit);
  const to = unitsById.get(toUnit);

  if (!from || !to || from.baseUnit !== to.baseUnit) {
    return null;
  }

  const fromMin = Number(from.baseFactorMin);
  const fromMax = Number(from.baseFactorMax);
  const toMin = Number(to.baseFactorMin);
  const toMax = Number(to.baseFactorMax);

  const fromFactor = (fromMin + fromMax) / 2;
  const toFactor = (toMin + toMax) / 2;

  const isApproximate =
    from.isApproximate || to.isApproximate || fromMin !== fromMax || toMin !== toMax;

  return {
    quantity: (quantity * fromFactor) / toFactor,
    unit: toUnit,
    isApproximate,
  };
}

function getCompatibleScaleUnits({
  units,
  fromUnit,
  context,
}: {
  units: Unit[];
  fromUnit: string;
  context: IngredientConversionContext;
}): Unit[] {
  const source = units.find((unit) => unit.id === fromUnit);

  if (!source) {
    return [];
  }

  const genericContext =
    source.baseUnit === "g"
      ? "mass"
      : source.baseUnit === "mL"
        ? "volume"
        : "count";
  const allowedContexts = new Set([genericContext, context]);
  const compatible = units.filter(
    (unit) =>
      unit.baseUnit === source.baseUnit &&
      allowedContexts.has(unit.context) &&
      isSelectableIngredientUnit(unit.id)
  );
  const byFactor = new Map<string, Unit>();

  compatible.forEach((unit) => {
    const factorKey = `${unit.baseFactorMin}:${unit.baseFactorMax}`;
    const current = byFactor.get(factorKey);

    if (!current || unit.id === fromUnit) {
      byFactor.set(factorKey, unit);
    }
  });

  return [...byFactor.values()].sort(
    (left, right) =>
      averageUnitFactor(left) - averageUnitFactor(right) ||
      left.name.localeCompare(right.name)
  );
}

export function buildScaleUnitOptions({
  units,
  quantity,
  fromUnit,
  context,
  mode,
  servingFactor = 1,
  countRule = "normal",
}: {
  units: Unit[];
  quantity: number;
  fromUnit: string;
  context: IngredientConversionContext;
  mode?: UnitMode;
  servingFactor?: number;
  countRule?: CountRule;
}): ScaleUnitOption[] {
  const unitsById = buildUnitLookup(units);
  // The spoon or gram an amount under half a cup shows in, or the spoon a
  // small metric volume shows in.
  const belowCupsUnit =
    mode === "cups" || mode === "metric"
      ? unitsById.get(
          convertIngredientQuantity({
            unitsById,
            quantity: quantity * servingFactor,
            fromUnit,
            context,
            mode,
          })?.unit ?? ""
        )
      : undefined;

  return getCompatibleScaleUnits({ units, fromUnit, context })
    .filter(
      (unit) =>
        !mode ||
        getUnitModeForUnitId(unit.id) === mode ||
        (belowCupsUnit !== undefined && isSameMeasure(unit, belowCupsUnit))
    )
    .flatMap((unit) => {
      const converted = convertQuantity({
        unitsById,
        quantity: quantity * servingFactor,
        fromUnit,
        toUnit: unit.id,
      });

      if (
        !converted ||
        (getUnitModeForUnitId(unit.id) === "cups" && converted.quantity < MIN_NIGERIAN_CUPS) ||
        tooSmallForUnit(converted.quantity, unit.id)
      ) {
        return [];
      }

      return [
        {
          ...converted,
          label: getUnitPickerLabel(unit),
          preview: formatAmountInUnit(unitsById, converted, undefined, countRule),
        },
      ];
    });
}

// The amount as it reads on the recipe: "≈1 ½ Milk cup", "38 g", "a pinch".
export function formatAmountInUnit(
  unitsById: Map<string, Unit>,
  { quantity, unit, isApproximate }: ConvertedQuantity,
  label = getUnitDisplayLabel(unitsById, unit),
  countRule: CountRule = "normal"
) {
  const definition = unitsById.get(unit);

  if (definition && isBelowPinch(quantity * averageUnitFactor(definition), definition.baseUnit)) {
    return PINCH;
  }

  const amount = friendlyQuantity(quantity, unit, countRule);
  // "3 Milk cups", "1 ½ Milk cups", but "¾ Small Derica cup".
  const shownLabel = /^\d/.test(amount) && amount !== "1" ? label.replace(/\bcup$/i, "cups") : label;
  return `${isApproximate ? "≈" : ""}${amount}${shownLabel ? ` ${shownLabel}` : ""}`;
}

function isSameMeasure(left: Unit, right: Unit) {
  return (
    left.baseUnit === right.baseUnit &&
    Number(left.baseFactorMin) === Number(right.baseFactorMin) &&
    Number(left.baseFactorMax) === Number(right.baseFactorMax)
  );
}

export function getUnitModeForUnitId(unitId: string | null): UnitMode | null {
  if (!unitId) {
    return null;
  }

  const normalized = unitId.toLowerCase();

  if (
    normalized.includes("milk_cup") ||
    normalized.includes("derica") ||
    normalized.includes("congo") ||
    normalized.includes("paint_rubber") ||
    normalized.includes("_bag_")
  ) {
    return "cups";
  }

  if (
    normalized === "oz" ||
    normalized === "lb" ||
    normalized === "tsp" ||
    normalized === "tbsp" ||
    normalized.startsWith("us_") ||
    normalized.startsWith("imp_") ||
    normalized.startsWith("imperial_") ||
    normalized.endsWith("_oz") ||
    normalized.endsWith("_lb")
  ) {
    return "imperial";
  }

  if (
    normalized === "cube" ||
    normalized === "mg" ||
    normalized === "g" ||
    normalized === "kg" ||
    normalized === "ml" ||
    normalized === "cl" ||
    normalized === "dl" ||
    normalized === "l" ||
    normalized.startsWith("metric_") ||
    normalized.endsWith("_mg") ||
    normalized.endsWith("_g") ||
    normalized.endsWith("_kg")
  ) {
    return "metric";
  }

  return null;
}

export function isSelectableIngredientUnit(unitId: string | null) {
  if (!unitId) {
    return true;
  }

  const normalized = unitId.toLowerCase();

  return !(
    normalized.includes("half_milk_cup") ||
    normalized.includes("paint_rubber") ||
    normalized.includes("custard_rubber")
  );
}

export function convertIngredientQuantity({
  unitsById,
  quantity,
  fromUnit,
  context,
  mode,
}: {
  unitsById: Map<string, Unit>;
  quantity: number;
  fromUnit: string;
  context: IngredientConversionContext;
  mode: UnitMode;
}): ConvertedQuantity | null {
  const contextUnits = CONTEXT_UNITS[context];

  // Unknown server contexts must fall back to the stored measurement.
  if (!contextUnits) {
    return null;
  }

  const fromDefinition = unitsById.get(fromUnit);
  const measuredByVolume = fromDefinition?.baseUnit === "mL";

  if (
    mode === "metric" &&
    fromDefinition &&
    measuredByVolume &&
    quantity * averageUnitFactor(fromDefinition) < METRIC_SPOONS_BELOW_ML
  ) {
    const spoons = inSpoons(unitsById, quantity, fromUnit);
    if (spoons) return spoons;
  }

  if (mode === "cups") {
    // Anything measured by volume (spices in mL too) goes in milk cups.
    const nigerianUnit = measuredByVolume ? "milk_cup" : contextUnits.nigerianDefault;

    if (!nigerianUnit) {
      return null;
    }

    const cups = convertQuantity({
      unitsById,
      quantity,
      fromUnit,
      toUnit: nigerianUnit,
    });

    // Under half a milk cup or derica, liquids show in spoons and dry food in
    // grams, so no amount reads "0.07 milk cup".
    if (!cups || cups.quantity >= MIN_NIGERIAN_CUPS) {
      return cups;
    }

    if (measuredByVolume) {
      return inSpoons(unitsById, quantity, fromUnit);
    }

    return contextUnits.metricSmall
      ? convertQuantity({ unitsById, quantity, fromUnit, toUnit: contextUnits.metricSmall })
      : null;
  }

  const smallUnit = mode === "metric" ? contextUnits.metricSmall : contextUnits.imperialSmall;
  const largeUnit = mode === "metric" ? contextUnits.metricLarge : contextUnits.imperialLarge;

  if (!smallUnit) {
    return null;
  }

  const small = convertQuantity({ unitsById, quantity, fromUnit, toUnit: smallUnit });

  if (!small || !largeUnit) {
    return small;
  }

  const large = convertQuantity({ unitsById, quantity, fromUnit, toUnit: largeUnit });
  const oneLargeInSmallUnits = convertQuantity({
    unitsById,
    quantity: 1,
    fromUnit: largeUnit,
    toUnit: smallUnit,
  });

  if (large && oneLargeInSmallUnits && small.quantity >= oneLargeInSmallUnits.quantity) {
    return large;
  }

  return small;
}

// Tablespoons from one up, teaspoons under that.
function inSpoons(unitsById: Map<string, Unit>, quantity: number, fromUnit: string) {
  const tablespoons = convertQuantity({ unitsById, quantity, fromUnit, toUnit: "tbsp" });
  return tablespoons && tablespoons.quantity >= 1
    ? tablespoons
    : convertQuantity({ unitsById, quantity, fromUnit, toUnit: "tsp" });
}

export function getAvailableModesForContext(
  context: IngredientConversionContext
): UnitMode[] {
  const contextUnits = CONTEXT_UNITS[context];

  if (!contextUnits) {
    return [];
  }

  const modes: UnitMode[] = [];

  if (contextUnits.metricSmall) modes.push("metric");
  if (contextUnits.nigerianDefault) modes.push("cups");
  if (contextUnits.imperialSmall) modes.push("imperial");

  return modes;
}

export function getIngredientConversionContext(
  ingredient: Ingredient | undefined
): IngredientConversionContext {
  return ingredient?.conversionContext ?? "mass";
}

export function getUnitDisplayLabel(unitsById: Map<string, Unit>, unitId: string): string {
  const unit = unitsById.get(unitId);

  if (!unit) {
    return unitId;
  }

  const shortLabels: Record<string, string> = {
    mg: "mg",
    g: "g",
    kg: "kg",
    oz: "oz",
    lb: "lb",
    mL: "mL",
    cL: "cL",
    dL: "dL",
    L: "L",
    tsp: "tsp",
    tbsp: "tbsp",
    metric_cup: "metric cup",
    us_floz: "fl oz",
    us_cup: "U.S. cup",
    imperial_cup: "Imperial cup",
    imp_floz: "fl oz",
  };

  const contextualShortLabel = unitId.match(/_(mg|kg|oz|lb|g)$/i)?.[1];

  return (
    shortLabels[unitId] ??
    contextualShortLabel ??
    unit.name.replace(/,.*$/, "")
  );
}

export function getUnitPickerLabel(unit: Unit): string {
  const unitId = unit.id.toLowerCase();

  if (unitId === "mg" || unitId.endsWith("_mg")) return "Milligrams";
  if (unitId === "g" || unitId.endsWith("_g")) return "Grams";
  if (unitId === "kg" || unitId.endsWith("_kg")) return "Kilograms";
  if (unitId === "oz" || unitId.endsWith("_oz")) return "Ounces";
  if (unitId === "lb" || unitId.endsWith("_lb")) return "Pounds";
  if (unitId === "ml" || unitId.endsWith("_ml")) return "Millilitres";
  if (unitId === "cl" || unitId.endsWith("_cl")) return "Centilitres";
  if (unitId === "dl" || unitId.endsWith("_dl")) return "Decilitres";
  if (unitId === "l" || unitId.endsWith("_l")) return "Litres";
  if (unitId === "tsp") return "Teaspoons";
  if (unitId === "tbsp") return "Tablespoons";
  if (unitId.includes("floz")) return "Fluid Ounces";
  if (unitId === "metric_cup" || unitId === "flour_metric_cup") {
    return "Metric Cup";
  }
  if (unitId === "us_cup") return "U.S. Cup";
  if (unitId === "imperial_cup") return "Imperial Cup";
  if (
    unitId.includes("derica") ||
    unitId.includes("congo") ||
    unitId.includes("paint_rubber") ||
    unitId.includes("milk_cup")
  ) {
    return unit.name.replace(/,.*$/, "");
  }
  if (unitId.includes("cup")) return "Cups";
  if (unitId === "item") return "Pieces";

  return unit.name;
}

function averageUnitFactor(unit: Unit) {
  return (Number(unit.baseFactorMin) + Number(unit.baseFactorMax)) / 2;
}
