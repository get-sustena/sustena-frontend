
import { create } from "zustand";
import { DEFAULT_SHOPPING_LIST_ID, ShoppingListMeta } from "../types/shoppingList";

type ShoppingListsState = {
  lists: ShoppingListMeta[];
  activeListId: string;

  hydrateLists: (lists: ShoppingListMeta[]) => void;
  addList: (list: ShoppingListMeta) => void;
  renameList: (listId: string, name: string) => void;
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
      set((state) => ({
        lists: [...state.lists, list],
        // A list made when there were none becomes the one to add to.
        activeListId: state.lists.some((item) => item.id === state.activeListId) ? state.activeListId : list.id,
      }));
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

    setActiveListId: (listId) => {
      set({ activeListId: listId });
    },

    defaultList: () => {
      return get().lists.find((list) => list.isDefaultSyncedList);
    },
  })
);
