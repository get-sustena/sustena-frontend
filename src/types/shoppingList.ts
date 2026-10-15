
// A recipe that added to an item: its exact amount in its own unit, or
// null for a line with no amount ("salt to taste").
export type ItemSource = {
  recipeId: string;
  recipeName: string;
  amount: string | null;
  unit: string | null;
};

export type ShoppingListItem = {
  id: string;
  name: string;
  emoji: string;
  quantity: string;
  amount?: number;
  displayQuantity?: string;
  unit?: string;
  category: string;
  estimatedPrice: number | null;
  priceStatus?: "unknown" | "estimated" | "confirmed";
  clientMutationId?: string;
  checked: boolean;
  sourceRecipeId?: string;
  // What its recipes need, exactly, e.g. "250 g" (SL-03); null when none.
  recipeAmount?: string | null;
  sources?: ItemSource[];
  // The recipe batch the item came with, until the server has it.
  recipeBatchId?: string;
  // The recipe line a generated item comes from; not stored.
  recipeIngredientId?: string;
  ingredientId?: string;
  // How the server matches a recipe's line to this row (SL-06).
  canonicalIngredientName?: string | null;
  createdAt: string;
  updatedAt: string;
  // Only items in the default list are synchronized with the server.
  listId?: string;
};

export type ShoppingListSection = {
  category: string;
  items: ShoppingListItem[];
};

export type ShoppingListMeta = {
  id: string;
  name: string;
  isDefaultSyncedList: boolean;
  createdAt: string;
  updatedAt: string;
};

export const DEFAULT_SHOPPING_LIST_ID = "default";
