// src/types/shoppingList.ts

export type ShoppingListItem = {
  id: string;
  name: string;
  emoji: string;
  quantity: string;
  unit?: string;
  category: string;
  estimatedPrice: number;
  checked: boolean;
  sourceRecipeId?: string;
  createdAt: string;
  updatedAt: string;
};

export type ShoppingListSection = {
  category: string;
  items: ShoppingListItem[];
};
