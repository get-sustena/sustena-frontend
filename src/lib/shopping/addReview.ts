// "Add ingredients to…" and "Review shopping quantities" (SL-06, prototype
// openDestinationSheet, renderMergeReview and confirmMerge): what adding
// recipes would do to a list, worked out with the server's own rules so
// the review shows exactly what lands on the list, offline too.
// Ingredients the person has in their pantry, or has ticked on that list,
// are left off (founder, 15 October 2026). Shared by the app and its tests.
import type { Ingredient } from "../../types/api.ts";
import type { ShoppingListItem } from "../../types/shoppingList.ts";
import { countRuleFor } from "../friendlyAmounts.ts";
import { generateItemsFromRecipes, mergeWithExisting, normalizeCategory, type ListRow, type RecipeSelectionInput } from "./recipeMerge.ts";
import { MASS_GRAMS, measureDisplayQuantity, recipeAmountText, shoppingDisplayQuantity, type UnitRow } from "./shoppingRules.ts";

// What the list needs to know about an ingredient: its subcategory (spices
// read in spoons, strong ones round down) and its measures (pieces, bunches).
type ShoppingIngredient = Pick<Ingredient, "subcategory" | "measures" | "countRule">;
type IngredientOf = (ingredientId: string | null | undefined) => ShoppingIngredient | null;

type ReviewInput = {
  rows: ListRow[];
  selections: RecipeSelectionInput[];
  units: Map<string, UnitRow>;
  pantryIngredientIds: Set<string>;
  ingredientOf: IngredientOf;
};

type NewRow = ListRow & { recipeId: string; sourceLines: string[] };

export function reviewRecipeAdd({ rows, selections, units, pantryIngredientIds, ingredientOf }: ReviewInput) {
  const measuresOf = (ingredientId: string | null | undefined) => ingredientOf(ingredientId)?.measures ?? [];
  const working = rows.map((row) => ({ ...row, sources: [...row.sources] }));
  const ticked = new Set(
    rows.filter((row) => row.checked).map((row) => (row.canonicalIngredientName ?? row.name.toLowerCase()).trim().toLowerCase())
  );
  const reviewRows = [];
  // Left off, as the server reports them (skippedInPantry).
  const inPantry: { ingredientId: string | null; name: string }[] = [];
  const mergedRows = new Map<string, ListRow>();
  const newRows: NewRow[] = [];
  // Where each recipe line lands: "recipeId|lineId" to the row's id.
  const landed: Record<string, string> = {};

  for (const generated of generateItemsFromRecipes(selections, units, measuresOf)) {
    const identity = (generated.canonicalIngredientName ?? generated.name.toLowerCase()).trim().toLowerCase();
    if ((generated.ingredientId && pantryIngredientIds.has(generated.ingredientId)) || ticked.has(identity)) {
      inPantry.push({ ingredientId: generated.ingredientId, name: generated.name });
      continue;
    }
    const category = normalizeCategory(generated.category);
    const merged = mergeWithExisting(working, { ...generated, category }, units, measuresOf);
    const row: ListRow =
      merged ??
      (() => {
        const created: NewRow = {
          id: `new:${generated.sourceLines[0]}`,
          name: generated.name,
          canonicalIngredientName: generated.canonicalIngredientName,
          ingredientId: generated.ingredientId,
          amount: generated.quantity,
          quantity: generated.quantity === null ? null : String(generated.quantity),
          unit: generated.unit,
          category,
          checked: false,
          sources: generated.sources,
          recipeId: generated.recipeId,
          sourceLines: generated.sourceLines,
        };
        working.push(created);
        newRows.push(created);
        return created;
      })();
    if (merged) mergedRows.set(merged.id, merged);
    for (const key of generated.sourceLines) landed[key] = row.id;
    reviewRows.push({
      key: generated.sourceLines[0],
      name: generated.name,
      recipeNeeds: recipeAmountText(generated.sources, ruleFor(generated.ingredientId, ingredientOf)),
      alreadyListed: Boolean(merged) && rows.some((existing) => existing.id === merged!.id),
      listQuantity: displayFor(row, ingredientOf),
    });
  }

  return { rows: reviewRows, inPantry, mergedRows: [...mergedRows.values()], newRows, landed, ingredientOf };
}

const ruleFor = (ingredientId: string | null | undefined, ingredientOf: IngredientOf) =>
  countRuleFor(ingredientId ? { id: ingredientId, subcategory: null, ...ingredientOf(ingredientId) } : undefined);

// The list quantity a row shows, as the server shows it: what recipes need
// in the ingredient's measure ("4 medium pieces"), otherwise the amount.
function displayFor(row: Pick<ListRow, "amount" | "unit" | "quantity" | "sources" | "ingredientId">, ingredientOf: IngredientOf) {
  const ingredient = ingredientOf(row.ingredientId);
  const rule = ruleFor(row.ingredientId, ingredientOf);
  const measure = ingredient?.measures?.find((candidate) => candidate.isDefault);
  if (measure && row.sources.length > 0 && row.amount && row.unit !== null && row.unit in MASS_GRAMS) {
    return measureDisplayQuantity(row.amount * MASS_GRAMS[row.unit], measure.unit, measure.size, Number(measure.grams), rule);
  }
  return shoppingDisplayQuantity(row.amount, row.unit, ingredient?.subcategory ?? null, rule) ?? row.quantity ?? "";
}

export function destinationSummary(review: ReturnType<typeof reviewRecipeAdd>) {
  const listed = review.rows.filter((row) => row.alreadyListed).length;
  return `${review.rows.length - listed} new · ${listed} already listed`;
}

// A list row as the phone stores it.
export function toStoredItem(row: ListRow, base: Pick<ShoppingListItem, "listId" | "createdAt" | "updatedAt">, ingredientOf: IngredientOf) {
  const display = displayFor(row, ingredientOf);
  return {
    ...base,
    id: row.id,
    name: row.name,
    canonicalIngredientName: row.canonicalIngredientName ?? null,
    ingredientId: row.ingredientId ?? undefined,
    emoji: "🛒",
    quantity: display,
    amount: row.amount ?? undefined,
    displayQuantity: display,
    unit: row.unit ?? undefined,
    category: row.category,
    estimatedPrice: null,
    priceStatus: "unknown" as const,
    checked: row.checked,
    recipeAmount: recipeAmountText(row.sources, ruleFor(row.ingredientId, ingredientOf)),
    sources: row.sources,
  };
}
