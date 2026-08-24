import { create } from "zustand";
import type { RecipeVocabularyItem } from "../types/api";

export type RecipeVocabularyPickerConfig = {
  title: string;
  description?: string;
  options: RecipeVocabularyItem[];
  selected: string[];
  single?: boolean;
  max?: number;
  showGroups?: boolean;
  groupSeparator?: string;
  onDone: (values: string[]) => void;
};

type RecipeVocabularyPickerState = {
  config: RecipeVocabularyPickerConfig | null;
  open: (config: RecipeVocabularyPickerConfig) => void;
};

export const useRecipeVocabularyPickerStore =
  create<RecipeVocabularyPickerState>((set) => ({
    config: null,
    open: (config) => set({ config }),
  }));

export function setRecipeVocabularyPicker(
  config: RecipeVocabularyPickerConfig
) {
  useRecipeVocabularyPickerStore.getState().open(config);
}
