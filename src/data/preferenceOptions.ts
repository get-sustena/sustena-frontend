// src/data/preferenceOptions.ts

import { DietaryPreference, HealthCondition } from "../types/preferences";

export type PreferenceOption<TValue extends string> = {
  label: string;
  value: TValue;
};

export const HEALTH_CONDITION_OPTIONS: PreferenceOption<HealthCondition>[] = [
  {
    label: "✓ None",
    value: "none",
  },
  {
    label: "🩸 Diabetic",
    value: "diabetic",
  },
  {
    label: "❤️ Hypertension",
    value: "hypertension",
  },
  {
    label: "🥛 Lactose Intolerant",
    value: "lactose_intolerant",
  },
  {
    label: "⚡ High Cholesterol",
    value: "high_cholesterol",
  },
  {
    label: "🌾 Gluten Sensitivity",
    value: "gluten_sensitivity",
  },
];

export const DIETARY_PREFERENCE_OPTIONS: PreferenceOption<DietaryPreference>[] =
  [
    {
      label: "🍖 No Restrictions",
      value: "no_restrictions",
    },
    {
      label: "🌱 Vegan",
      value: "vegan",
    },
    {
      label: "🥦 Vegetarian",
      value: "vegetarian",
    },
    {
      label: "🐟 Pescetarian",
      value: "pescetarian",
    },
    {
      label: "☪️ Halal",
      value: "halal",
    },
    {
      label: "🥚 Keto",
      value: "keto",
    },
    {
      label: "🔥 High Protein",
      value: "high_protein",
    },
  ];

export function getHealthConditionLabel(value: HealthCondition) {
  return (
    HEALTH_CONDITION_OPTIONS.find((option) => option.value === value)?.label ??
    value
  );
}

export function getDietaryPreferenceLabel(value: DietaryPreference) {
  return (
    DIETARY_PREFERENCE_OPTIONS.find((option) => option.value === value)
      ?.label ?? value
  );
}
