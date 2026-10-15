
import { DietaryPreference } from "../types/preferences";

type PreferenceOption<TValue extends string> = {
  label: string;
  value: TValue;
};

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
