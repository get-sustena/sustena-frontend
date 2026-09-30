
export type RecipeFilter = {
  label: string;
  value: string;
};

export const RECIPE_FILTERS: RecipeFilter[] = [
  {
    label: "All",
    value: "all",
  },
  {
    label: "Nigerian",
    value: "nigerian",
  },
  {
    label: "Vegan",
    value: "vegan",
  },
  {
    label: "Budget",
    value: "budget",
  },
  {
    label: "High Protein",
    value: "highprotein",
  },
  {
    label: "Quick",
    value: "quick",
  },
  {
    label: "Pescetarian",
    value: "pescetarian",
  },
];
