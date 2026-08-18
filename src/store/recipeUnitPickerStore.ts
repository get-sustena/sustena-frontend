import { create } from "zustand";
import type { Unit } from "../types/api";

export type RecipeUnitPickerConfig = {
  units: Unit[];
  selected: string | null;
  recommended: string | null;
  onSelect: (unitId: string | null) => void;
};

type RecipeUnitPickerState = {
  config: RecipeUnitPickerConfig | null;
  open: (config: RecipeUnitPickerConfig) => void;
};

export const useRecipeUnitPickerStore = create<RecipeUnitPickerState>((set) => ({
  config: null,
  open: (config) => set({ config }),
}));

export function setRecipeUnitPicker(config: RecipeUnitPickerConfig) {
  useRecipeUnitPickerStore.getState().open(config);
}
