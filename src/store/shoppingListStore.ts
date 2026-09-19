// src/store/shoppingListStore.ts

import { create } from "zustand";
import { formatQuantityValue } from "../lib/scaling";
import { extractLeadingQuantity } from "../lib/quantityParsing";
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
      return total + (item.estimatedPrice ?? 0);
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
    const existingIndex = items.findIndex(
      (item) =>
        item.name.toLowerCase() === newItem.name.toLowerCase() &&
        item.category === newItem.category
    );

    if (existingIndex === -1) {
      items.push(newItem);
      continue;
    }

    const existingItem = items[existingIndex];
    const mergedQuantity = mergeQuantities(
      existingItem.quantity,
      newItem.quantity
    );

    if (mergedQuantity === null) {
      // Units don't match or aren't parseable. Keep both lines rather
      // than dropping or silently combining incompatible quantities.
      items.push(newItem);
      continue;
    }

    items[existingIndex] = {
      ...existingItem,
      quantity: mergedQuantity,
      estimatedPrice:
        existingItem.estimatedPrice === null || newItem.estimatedPrice === null
          ? null
          : existingItem.estimatedPrice + newItem.estimatedPrice,
      updatedAt: new Date().toISOString(),
    };
  }

  return items;
}

function mergeQuantities(a: string, b: string): string | null {
  const parsedA = extractLeadingQuantity(a);
  const parsedB = extractLeadingQuantity(b);

  if (!parsedA || !parsedB) {
    return a === b ? a : null;
  }

  if (parsedA.unit.toLowerCase() !== parsedB.unit.toLowerCase()) {
    return null;
  }

  const sum = formatQuantityValue(parsedA.value + parsedB.value);

  return parsedA.unit ? `${sum} ${parsedA.unit}` : sum;
}
