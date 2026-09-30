
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
  ingredientId?: string;
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
