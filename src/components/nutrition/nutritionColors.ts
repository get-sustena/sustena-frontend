import type { NutrientKey } from "../../lib/nutrition/recipeNutrition";

// The v6.8 prototype's nutrition colours (--nu-*) and the recipe page's
// (--rd-*). Protein, carbs and fat keep one colour each everywhere.
export const nutritionColors = {
  protein: "#1F7048",
  carbs: "#E3A62E",
  fat: "#9B681F",
  canvas: "#F5F3EC",
  sheet: "#FFFFFF",
  track: "#FFFFFF",
  chip: "#FFFFFF",
  tintProtein: "#EDF3E4",
  tintCarbs: "#FBF0DC",
  tintFat: "#F5F3EC",
  good: "#1F7048",
  watch: "#8A5A12",
  well: "rgba(23,41,30,0.06)",
  edge: "rgba(23,41,30,0.16)",
  shadow: "rgba(23,41,30,0.08)",
  soft: "#8A9187",
} as const;

export const recipeColors = {
  ink: "#17291E",
  text: "#20241F",
  muted: "#686E66",
  line: "#E2E2E0",
  paper: "#FFFFFF",
  canvas: "#FAFAF8",
} as const;

export const MACROS: {
  key: Extract<NutrientKey, "proteinG" | "carbsG" | "fatG">;
  name: string;
  icon: "protein" | "carbs" | "fat";
  hue: string;
  tint: string;
}[] = [
  { key: "proteinG", name: "Protein", icon: "protein", hue: nutritionColors.protein, tint: nutritionColors.tintProtein },
  { key: "carbsG", name: "Carbs", icon: "carbs", hue: nutritionColors.carbs, tint: nutritionColors.tintCarbs },
  { key: "fatG", name: "Fat", icon: "fat", hue: nutritionColors.fat, tint: nutritionColors.tintFat },
];

// The bar's sources fade from the macro's colour towards white, as the
// prototype's color-mix(hue N%, white) does.
const SHADES = [1, 0.66, 0.42, 0.22];

export function sourceShade(hue: string, index: number) {
  const amount = SHADES[index] ?? SHADES[SHADES.length - 1];
  const channel = (offset: number) => {
    const value = parseInt(hue.slice(offset, offset + 2), 16);
    return Math.round(value * amount + 255 * (1 - amount));
  };
  return `rgb(${channel(1)}, ${channel(3)}, ${channel(5)})`;
}
