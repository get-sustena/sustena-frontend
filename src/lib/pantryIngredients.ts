import type { Ingredient } from "../types/api";

export const PANTRY_CATEGORIES = [
  "All",
  "Proteins",
  "Grains",
  "Produce",
  "Spices",
  "Dairy",
] as const;

const CATEGORY_NEEDLES: Record<string, string[]> = {
  Proteins: ["meat", "poultry", "fish", "seafood", "beans", "pulses", "nuts"],
  Grains: ["grains", "cereals", "flours", "pasta", "noodles", "tubers"],
  Produce: ["vegetables", "greens", "fruits"],
  Spices: ["herbs", "spices", "seasonings", "condiments", "sauces"],
  Dairy: ["dairy", "eggs", "alternatives"],
};

export function matchesPantryCategory(ingredient: Ingredient, category: string) {
  if (category === "All") return true;
  const backendCategory = ingredient.categoryName?.toLowerCase() ?? "";
  return (CATEGORY_NEEDLES[category] ?? []).some((needle) =>
    backendCategory.includes(needle)
  );
}

export function matchesPantrySearch(ingredient: Ingredient, search: string) {
  const query = search.trim().toLowerCase();
  if (!query) return true;
  return [
    ingredient.canonicalName,
    ingredient.displayName,
    ...ingredient.aliases,
    ...ingredient.searchTerms,
    ...ingredient.localNames.map((item) => item.name),
  ].some((value) => value.toLowerCase().includes(query));
}

export function filterPantryPickerIngredients(
  ingredients: Ingredient[],
  search: string,
  category: string
) {
  const query = search.trim();
  const matching = query
    ? ingredients.filter((ingredient) => matchesPantrySearch(ingredient, query))
    : category === "All"
      ? ingredients
      : ingredients.filter((ingredient) =>
          matchesPantryCategory(ingredient, category)
        );

  return [...matching].sort((a, b) =>
    a.displayName.localeCompare(b.displayName)
  );
}

export function pantryDisplayCategory(ingredient: Ingredient) {
  return (
    PANTRY_CATEGORIES.find(
      (category) => category !== "All" && matchesPantryCategory(ingredient, category)
    ) ?? "Pantry"
  );
}
