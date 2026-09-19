// src/store/shoppingListsStore.ts
// Metadata for the "Your Lists" multi-list feature: which lists exist and
// which one is active. Item contents for the active list still live in
// shoppingListStore.ts.

import { create } from "zustand";
import { DEFAULT_SHOPPING_LIST_ID, ShoppingListMeta } from "../types/shoppingList";

type ShoppingListsState = {
  lists: ShoppingListMeta[];
  activeListId: string;

  hydrateLists: (lists: ShoppingListMeta[]) => void;
  addList: (list: ShoppingListMeta) => void;
  renameList: (listId: string, name: string) => void;
  removeList: (listId: string) => void;
  setActiveListId: (listId: string) => void;

  defaultList: () => ShoppingListMeta | undefined;
};

export const useShoppingListsStore = create<ShoppingListsState>(
  (set, get) => ({
    lists: [],
    activeListId: DEFAULT_SHOPPING_LIST_ID,

    hydrateLists: (lists) => {
      const active = lists.find((list) => list.isDefaultSyncedList);
      set({
        lists,
        activeListId: active?.id ?? lists[0]?.id ?? DEFAULT_SHOPPING_LIST_ID,
      });
    },

    addList: (list) => {
      set((state) => ({ lists: [...state.lists, list] }));
    },

    renameList: (listId, name) => {
      set((state) => ({
        lists: state.lists.map((list) =>
          list.id === listId
            ? { ...list, name, updatedAt: new Date().toISOString() }
            : list
        ),
      }));
    },

    removeList: (listId) => {
      set((state) => {
        const list = state.lists.find((item) => item.id === listId);

        // The default synced list can never be removed locally. It's the
        // one list wired to the real backend.
        if (!list || list.isDefaultSyncedList) {
          return state;
        }

        return {
          lists: state.lists.filter((item) => item.id !== listId),
          activeListId:
            state.activeListId === listId
              ? state.lists.find((item) => item.id !== listId)?.id ??
                DEFAULT_SHOPPING_LIST_ID
              : state.activeListId,
        };
      });
    },

    setActiveListId: (listId) => {
      set({ activeListId: listId });
    },

    defaultList: () => {
      return get().lists.find((list) => list.isDefaultSyncedList);
    },
  })
);
