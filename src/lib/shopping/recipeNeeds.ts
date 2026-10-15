// The grey line under an item's quantity (SL-03, prototype shopItem): what
// its recipes need, and how many recipes when more than one added it.
// Items typed in by hand get none. Shared by the app and its tests.
import type { ItemSource } from "../../types/shoppingList.ts";

export function recipeNeedsLine({ recipeAmount, sources }: { recipeAmount?: string | null; sources?: ItemSource[] }) {
  const recipes = new Set((sources ?? []).map((source) => source.recipeId)).size;
  const parts = [recipeAmount ? `Recipe needs ${recipeAmount}` : "", recipes > 1 ? `${recipes} recipes` : ""].filter(Boolean);
  return parts.length ? parts.join(" · ") : null;
}
