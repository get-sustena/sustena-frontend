// src/lib/unitConversion.ts
//
// Client-side unit conversion, mirroring the backend's unit_conversion_service.convert_quantity:
// two units convert into one another only if they share a base unit (grams or millilitres) --
// that's the real compatibility gate, not `context`. `context` instead says which units are
// sensible to *offer* for a given ingredient (e.g. only rice-category ingredients should offer
// a Derica cup), which is what lets a recipe stored as plain "300 g" still convert into a
// Derica-cup reading for a rice ingredient.

import { Ingredient, IngredientConversionContext, Unit } from "../types/api";
import { formatQuantityValue } from "./scaling";

export type UnitMode = "metric" | "cups" | "imperial";

export interface ConvertedQuantity {
  quantity: number;
  unit: string;
  isApproximate: boolean;
}

interface ContextUnitMap {
  metricSmall: string | null;
  metricLarge: string | null;
  cup: string | null;
  imperialSmall: string | null;
  imperialLarge: string | null;
}

// Ingredient-specific "cup"/oz/lb equivalents only exist for rice, plain flour, millet, and
// sorghum in the unit catalog -- everything else measured by mass (meat, vegetables, etc.) has
// no defined cup conversion, so "cups" mode is intentionally unavailable for it rather than
// guessing at a "1 cup ≈ 125g" rule of thumb that isn't backed by real data.
const CONTEXT_UNITS: Record<IngredientConversionContext, ContextUnitMap> = {
  mass: {
    metricSmall: "g",
    metricLarge: "kg",
    cup: null,
    imperialSmall: "oz",
    imperialLarge: "lb",
  },
  volume: {
    metricSmall: "mL",
    metricLarge: "L",
    cup: "metric_cup",
    imperialSmall: "us_floz",
    imperialLarge: "us_cup",
  },
  rice: {
    metricSmall: "rice_g",
    metricLarge: "rice_kg",
    cup: "rice_derica_small",
    imperialSmall: "rice_oz",
    imperialLarge: "rice_lb",
  },
  plain_flour: {
    metricSmall: "flour_g",
    metricLarge: "flour_kg",
    cup: "flour_metric_cup",
    imperialSmall: "flour_oz",
    imperialLarge: "flour_lb",
  },
  millet: {
    metricSmall: "millet_g",
    metricLarge: "millet_kg",
    cup: "millet_derica_small",
    imperialSmall: "millet_oz",
    imperialLarge: "millet_lb",
  },
  sorghum: {
    metricSmall: "sorghum_g",
    metricLarge: "sorghum_kg",
    cup: "sorghum_derica_small",
    imperialSmall: "sorghum_oz",
    imperialLarge: "sorghum_lb",
  },
  count: {
    metricSmall: null,
    metricLarge: null,
    cup: null,
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

/**
 * Converts a recipe ingredient's stored quantity/unit into the unit appropriate for a display
 * mode (metric/cups/imperial), auto-switching between the small/large metric or imperial unit
 * (e.g. g <-> kg, oz <-> lb) once the small-unit reading would cross the large unit's own size.
 * Returns null when this mode has no valid unit for the ingredient's conversionContext (e.g.
 * "cups" for a generic mass ingredient, or any mode for a count-based ingredient).
 */
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

  if (mode === "cups") {
    if (!contextUnits.cup) {
      return null;
    }

    return convertQuantity({ unitsById, quantity, fromUnit, toUnit: contextUnits.cup });
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

export function getAvailableModesForContext(
  context: IngredientConversionContext
): UnitMode[] {
  const contextUnits = CONTEXT_UNITS[context];
  const modes: UnitMode[] = [];

  if (contextUnits.metricSmall) modes.push("metric");
  if (contextUnits.cup) modes.push("cups");
  if (contextUnits.imperialSmall) modes.push("imperial");

  return modes;
}

export function getIngredientConversionContext(
  ingredient: Ingredient | undefined
): IngredientConversionContext {
  return ingredient?.conversionContext ?? "mass";
}

// "Cups" reads naturally as a fraction (e.g. "¾ cup"); metric/imperial mass and volume read
// more naturally as a rounded decimal (e.g. "127.5 g", not "127⅛ g").
export function formatConvertedQuantity(quantity: number, mode: UnitMode): string {
  if (!Number.isFinite(quantity) || quantity <= 0) {
    return "0";
  }

  if (mode === "cups") {
    return formatQuantityValue(quantity);
  }

  const rounded = quantity >= 10 ? Math.round(quantity) : Math.round(quantity * 10) / 10;
  return String(rounded);
}

export function getUnitDisplayLabel(unitsById: Map<string, Unit>, unitId: string): string {
  const unit = unitsById.get(unitId);

  if (!unit) {
    return unitId;
  }

  // Ingredient-specific unit names are long ("Small Derica cup, level rice") -- the catalog id
  // suffix reads better as a compact pill label than the full descriptive name.
  const shortLabels: Record<string, string> = {
    g: "g",
    kg: "kg",
    oz: "oz",
    lb: "lb",
    mL: "mL",
    L: "L",
    metric_cup: "cup",
    us_floz: "fl oz",
    us_cup: "cup",
  };

  return (
    shortLabels[unitId] ??
    unit.name.replace(/^(Small|Large) /, "").replace(/,.*$/, "")
  );
}
