import { create } from "zustand";

type PantryState = {
  ingredientIds: string[];
  hydratePantry: (ingredientIds: string[]) => void;
  addIngredients: (ingredientIds: string[]) => void;
  removeIngredient: (ingredientId: string) => void;
  clearPantry: () => void;
};

export const usePantryStore = create<PantryState>((set) => ({
  ingredientIds: [],
  hydratePantry: (ingredientIds) => set({ ingredientIds: [...new Set(ingredientIds)] }),
  addIngredients: (ingredientIds) =>
    set((state) => ({
      ingredientIds: [...new Set([...state.ingredientIds, ...ingredientIds])],
    })),
  removeIngredient: (ingredientId) =>
    set((state) => ({
      ingredientIds: state.ingredientIds.filter((id) => id !== ingredientId),
    })),
  clearPantry: () => set({ ingredientIds: [] }),
}));
