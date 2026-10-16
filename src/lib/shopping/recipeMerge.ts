// What adding recipes does to a list, worked out on the phone so it shows
// and saves offline (SL-06). A port of cookease-backend
// app/services/shopping_list_service.py: generate_items_from_recipes,
// _try_merge_with_convertible_item, _merge_generated_with_existing and
// combine_sources, pinned to them by the server's fixtures. After a sync
// the server's own rows replace these. Shared by the app and its tests.
import type { IngredientMeasure } from "../../types/api.ts";
import type { ItemSource } from "../../types/shoppingList.ts";
import { boughtAmount, inExistingMeasures } from "./measureRules.ts";
import { convertQuantity, type UnitRow } from "./shoppingRules.ts";

// An ingredient's measures from the saved catalogue; none when unknown.
type MeasuresOf = (ingredientId: string | null | undefined) => IngredientMeasure[];
const noMeasures: MeasuresOf = () => [];

export type RecipeLine = {
  id: string;
  ingredientId: string | null;
  name: string;
  canonicalIngredientName: string | null;
  quantity: number | null;
  unit: string | null;
  // "medium" picks the measure a line in pieces means.
  sizeNote: string | null;
  category: string | null;
  isOptional: boolean;
};

export type RecipeSelectionInput = {
  recipe: { id: string; name: string; baseServings: number | null; lines: RecipeLine[] };
  servings: number;
  // A unit the person picked for a line on the recipe page, by line id.
  unitOverrides?: Record<string, string>;
};

type GeneratedItem = {
  ingredientId: string | null;
  recipeId: string;
  name: string;
  canonicalIngredientName: string | null;
  quantity: number | null;
  unit: string | null;
  category: string | null;
  // The recipe lines it was made from, as "recipeId|lineId".
  sourceLines: string[];
  sources: ItemSource[];
};

export type ListRow = {
  id: string;
  name: string;
  canonicalIngredientName?: string | null;
  ingredientId?: string | null;
  // The exact amount; null for a quantity someone typed, such as "a bunch".
  amount: number | null;
  quantity: string | null;
  unit: string | null;
  category: string;
  checked: boolean;
  sources: ItemSource[];
};

// Decimal.normalize() written out: no trailing zeros.
const decimalText = (value: number | null) => (value === null ? null : String(Number(value.toFixed(10))));

const lineKey = (recipeId: string, lineId: string) => `${recipeId}|${lineId}`;

const CATEGORY_ALIASES: Record<string, string> = {
  produce: "produce",
  fruit: "produce",
  fruits: "produce",
  vegetable: "produce",
  vegetables: "produce",
  meat: "meat_seafood",
  poultry: "meat_seafood",
  fish: "meat_seafood",
  seafood: "meat_seafood",
  "meat & seafood": "meat_seafood",
  grains: "grains_staples",
  staples: "grains_staples",
  "grains & staples": "grains_staples",
  dairy: "dairy_eggs",
  eggs: "dairy_eggs",
  "dairy & eggs": "dairy_eggs",
  herbs: "herbs_spices",
  spices: "herbs_spices",
  "herbs & spices": "herbs_spices",
  pantry: "pantry",
  uncategorized: "other",
  other: "other",
};
const KNOWN_CATEGORIES = new Set(Object.values(CATEGORY_ALIASES));

export function normalizeCategory(category: string | null) {
  if (!category) return "other";
  const key = category.trim().toLowerCase().replace(/-/g, "_");
  return CATEGORY_ALIASES[key] ?? (KNOWN_CATEGORIES.has(key) ? key : "other");
}

// One source per recipe and unit, in the order first seen; amounts for the
// same recipe and unit add up.
function combineSources(...groups: ItemSource[][]) {
  const combined = new Map<string, ItemSource>();
  for (const source of groups.flat()) {
    const key = `${source.recipeId}\u0000${source.unit ?? ""}`;
    const current = combined.get(key);
    if (!current) {
      combined.set(key, { ...source });
      continue;
    }
    const amounts = [current.amount, source.amount].filter((value): value is string => value !== null).map(Number);
    current.amount = amounts.length ? decimalText(amounts.reduce((sum, value) => sum + value, 0)) : null;
  }
  return [...combined.values()];
}

const identityOf = (item: { canonicalIngredientName?: string | null; name: string }) =>
  item.canonicalIngredientName ?? item.name.toLowerCase();

export function generateItemsFromRecipes(
  selections: RecipeSelectionInput[],
  units: Map<string, UnitRow>,
  measuresOf: MeasuresOf = noMeasures
) {
  const grouped = new Map<string, { key: [string, string | null]; item: GeneratedItem }>();
  const groupKey = (name: string, unit: string | null) => `${name}\u0000${unit ?? "\u0001"}`;

  for (const { recipe, servings, unitOverrides } of selections) {
    const scale = servings / (recipe.baseServings || 1);
    for (const line of recipe.lines) {
      if (line.isOptional) continue;
      const [quantity, unit] = boughtAmount(line.quantity, line.unit, line.sizeNote, measuresOf(line.ingredientId));
      const generated: GeneratedItem = {
        ingredientId: line.ingredientId,
        recipeId: recipe.id,
        name: line.name,
        canonicalIngredientName: line.canonicalIngredientName,
        quantity: quantity === null ? null : quantity * scale,
        unit,
        category: line.category,
        sourceLines: [lineKey(recipe.id, line.id)],
        sources: [],
      };
      const override = unitOverrides?.[line.id];
      if (override && generated.quantity !== null && generated.unit) {
        const conversion = convertQuantity(generated.quantity, generated.unit, override, units);
        if (conversion) {
          generated.quantity = conversion.quantity;
          generated.unit = override;
        }
      }
      generated.sources = [
        { recipeId: recipe.id, recipeName: recipe.name, amount: decimalText(generated.quantity), unit: generated.unit },
      ];
      const name = identityOf(generated);
      const key = groupKey(name, generated.unit);
      const existing = grouped.get(key);
      if (existing && generated.quantity !== null) {
        existing.item.quantity = (existing.item.quantity ?? 0) + generated.quantity;
        existing.item.sourceLines.push(...generated.sourceLines);
        existing.item.sources = combineSources(existing.item.sources, generated.sources);
        continue;
      }
      if (!mergeWithConvertibleItem(grouped, generated, units)) grouped.set(key, { key: [name, generated.unit], item: generated });
    }
  }

  // Grouped by category, categories in sort order, as the server returns them.
  const byCategory = new Map<string, GeneratedItem[]>();
  for (const { item } of grouped.values()) {
    const category = item.category || "uncategorized";
    byCategory.set(category, [...(byCategory.get(category) ?? []), item]);
  }
  return [...byCategory.keys()].sort().flatMap((category) => byCategory.get(category)!);
}

function mergeWithConvertibleItem(
  grouped: Map<string, { key: [string, string | null]; item: GeneratedItem }>,
  generated: GeneratedItem,
  units: Map<string, UnitRow>
) {
  if (generated.quantity === null || generated.unit === null) return false;
  for (const { key: [name, unit], item } of grouped.values()) {
    if (name !== identityOf(generated) || unit === null) continue;
    const conversion = convertQuantity(generated.quantity, generated.unit, unit, units);
    if (conversion && !conversion.isApproximate) {
      item.quantity = (item.quantity ?? 0) + conversion.quantity;
      item.sourceLines.push(...generated.sourceLines);
      item.sources = combineSources(item.sources, generated.sources);
      return true;
    }
  }
  return false;
}

// The existing row a generated item merges into, updated, or null when it
// needs a row of its own.
export function mergeWithExisting(
  rows: ListRow[],
  generated: GeneratedItem,
  units: Map<string, UnitRow>,
  measuresOf: MeasuresOf = noMeasures
) {
  const identity = identityOf(generated).trim().toLowerCase();
  for (const row of rows) {
    if (identityOf(row).trim().toLowerCase() !== identity) continue;
    if (generated.quantity === null) {
      row.sources = combineSources(row.sources, generated.sources);
      return row;
    }
    let rowAmount = row.amount;
    if (rowAmount === null && row.quantity) {
      // A typed quantity such as "a bunch" isn't a number, so the recipe's
      // amount goes on its own row.
      rowAmount = /^\s*-?(\d+(\.\d*)?|\.\d+)\s*$/.test(row.quantity) ? Number(row.quantity) : null;
    }
    if (rowAmount === null) continue;
    let amount = generated.quantity;
    if (generated.unit !== row.unit) {
      if (!generated.unit || !row.unit) continue;
      const inMeasures = inExistingMeasures(row.unit, amount, generated.unit, measuresOf(row.ingredientId));
      const conversion = inMeasures === null ? convertQuantity(amount, generated.unit, row.unit, units) : null;
      if (inMeasures !== null) amount = inMeasures;
      else if (conversion && !conversion.isApproximate) amount = conversion.quantity;
      else continue;
    }
    row.amount = rowAmount + amount;
    row.quantity = decimalText(row.amount);
    row.sources = combineSources(row.sources, generated.sources);
    return row;
  }
  return null;
}

type StoredRecipe = {
  id: string;
  name: string;
  baseServings: number | null;
  ingredients: {
    id: string;
    ingredientId: string | null;
    ingredientName: string | null;
    canonicalIngredientName: string | null;
    rawText: string;
    quantity: string | number | null;
    // The stored amount in full; `quantity` is rounded for the recipe page.
    // Missing from recipes saved before it existed.
    exactQuantity?: string | null;
    unit: string | null;
    sizeNote?: string | null;
    category: string | null;
    isOptional: boolean;
  }[];
};

// A recipe as the phone stores it (the server's recipe detail), as the
// lines the server adds to a list, with the units the person picked.
export function selectionFromRecipe(
  recipe: StoredRecipe,
  servings: number,
  unitOverrides: { ingredientId: string; unit: string }[] = []
): RecipeSelectionInput {
  return {
    recipe: {
      id: recipe.id,
      name: recipe.name,
      baseServings: recipe.baseServings,
      lines: recipe.ingredients.map((line) => ({
        id: line.id,
        ingredientId: line.ingredientId,
        name: line.ingredientName ?? line.canonicalIngredientName ?? line.rawText,
        canonicalIngredientName: line.canonicalIngredientName,
        quantity: (line.exactQuantity ?? line.quantity) === null ? null : Number(line.exactQuantity ?? line.quantity),
        unit: line.unit,
        sizeNote: line.sizeNote ?? null,
        category: line.category,
        isOptional: line.isOptional,
      })),
    },
    servings,
    unitOverrides: Object.fromEntries(unitOverrides.map((override) => [override.ingredientId, override.unit])),
  };
}
