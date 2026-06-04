// src/store/shoppingListStore.ts

import { create } from "zustand";
import { ShoppingListItem } from "../types/shoppingList";

type ShoppingListState = {
  items: ShoppingListItem[];

  hydrateItems: (items: ShoppingListItem[]) => void;

  addItems: (items: ShoppingListItem[]) => void;
  toggleItem: (itemId: string) => void;
  removeItem: (itemId: string) => void;
  clearCheckedItems: () => void;
  clearAllItems: () => void;

  totalEstimatedCost: () => number;
  checkedCount: () => number;
  itemCount: () => number;
};

export const useShoppingListStore = create<ShoppingListState>((set, get) => ({
  items: [],

  hydrateItems: (items) => {
    set({
      items,
    });
  },

  addItems: (newItems) => {
    set((state) => {
      const mergedItems = mergeShoppingListItems(state.items, newItems);

      return {
        items: mergedItems,
      };
    });
  },

  toggleItem: (itemId) => {
    set((state) => ({
      items: state.items.map((item) =>
        item.id === itemId
          ? {
              ...item,
              checked: !item.checked,
              updatedAt: new Date().toISOString(),
            }
          : item
      ),
    }));
  },

  removeItem: (itemId) => {
    set((state) => ({
      items: state.items.filter((item) => item.id !== itemId),
    }));
  },

  clearCheckedItems: () => {
    set((state) => ({
      items: state.items.filter((item) => !item.checked),
    }));
  },

  clearAllItems: () => {
    set({
      items: [],
    });
  },

  totalEstimatedCost: () => {
    return get().items.reduce((total, item) => {
      return total + item.estimatedPrice;
    }, 0);
  },

  checkedCount: () => {
    return get().items.filter((item) => item.checked).length;
  },

  itemCount: () => {
    return get().items.length;
  },
}));

function mergeShoppingListItems(
  existingItems: ShoppingListItem[],
  newItems: ShoppingListItem[]
) {
  const items = [...existingItems];

  for (const newItem of newItems) {
    const existingItem = items.find(
      (item) =>
        item.name.toLowerCase() === newItem.name.toLowerCase() &&
        item.quantity === newItem.quantity &&
        item.category === newItem.category
    );

    if (existingItem) {
      // For now, avoid duplicating the exact same item.
      // Later, when ingredients are structured, we can merge quantities properly.
      continue;
    }

    items.push(newItem);
  }

  return items;
}
