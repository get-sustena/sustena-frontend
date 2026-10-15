// "Add ingredients to…" and "Review shopping quantities" (SL-06, prototype
// openDestinationSheet, renderMergeReview and confirmMerge): what adding
// recipes would do to a list, worked out with the server's own rules so
// the review shows exactly what lands on the list, offline too.
// Ingredients the person has in their pantry, or has ticked on that list,
// are left off (founder, 15 October 2026). Shared by the app and its tests.
import type { ShoppingListItem } from "../../types/shoppingList.ts";
import { generateItemsFromRecipes, mergeWithExisting, normalizeCategory, type ListRow, type RecipeSelectionInput } from "./recipeMerge.ts";
import { recipeAmountText, shoppingDisplayQuantity, type UnitRow } from "./shoppingRules.ts";

type ReviewInput = {
  rows: ListRow[];
  selections: RecipeSelectionInput[];
  units: Map<string, UnitRow>;
  pantryIngredientIds: Set<string>;
  // The catalogue subcategory, which decides whether a spice reads in spoons.
  subcategoryOf: (ingredientId: string | null) => string | null;
};

type NewRow = ListRow & { recipeId: string; sourceLines: string[] };

export function reviewRecipeAdd({ rows, selections, units, pantryIngredientIds, subcategoryOf }: ReviewInput) {
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

  for (const generated of generateItemsFromRecipes(selections, units)) {
    const identity = (generated.canonicalIngredientName ?? generated.name.toLowerCase()).trim().toLowerCase();
    if ((generated.ingredientId && pantryIngredientIds.has(generated.ingredientId)) || ticked.has(identity)) {
      inPantry.push({ ingredientId: generated.ingredientId, name: generated.name });
      continue;
    }
    const category = normalizeCategory(generated.category);
    const subcategory = subcategoryOf(generated.ingredientId);
    const merged = mergeWithExisting(working, { ...generated, category }, units);
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
      recipeNeeds: recipeAmountText(generated.sources),
      alreadyListed: Boolean(merged) && rows.some((existing) => existing.id === merged!.id),
      listQuantity: displayFor(row, subcategory),
    });
  }

  return { rows: reviewRows, inPantry, mergedRows: [...mergedRows.values()], newRows, landed, subcategoryOf };
}

// The list quantity a row shows, as the server shows it.
function displayFor(row: Pick<ListRow, "amount" | "unit" | "quantity">, subcategory: string | null) {
  return shoppingDisplayQuantity(row.amount, row.unit, subcategory) ?? row.quantity ?? "";
}

export function destinationSummary(review: ReturnType<typeof reviewRecipeAdd>) {
  const listed = review.rows.filter((row) => row.alreadyListed).length;
  return `${review.rows.length - listed} new · ${listed} already listed`;
}

// A list row as the phone stores it.
export function toStoredItem(row: ListRow, base: Pick<ShoppingListItem, "listId" | "createdAt" | "updatedAt">, subcategory: string | null) {
  const display = displayFor(row, subcategory);
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
    recipeAmount: recipeAmountText(row.sources),
    sources: row.sources,
  };
}
