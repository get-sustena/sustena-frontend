// src/types/shoppingList.ts

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
  // Which local shopping_lists row this item belongs to. Only the default
  // synced list (see ShoppingListMeta.isDefaultSyncedList) round-trips
  // through the real API/sync queue. Every other list is local-only.
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
