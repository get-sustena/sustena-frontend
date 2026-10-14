import { create } from "zustand";
import type { StartedTimers } from "../lib/learnMode/learnTimers";

// Learn mode's timers outlive the screen: they keep running when it closes,
// and its notifications still arrive. Opening another recipe's Learn mode
// starts afresh, as in the v6.8 prototype.
type LearnState = {
  recipeId: string | null;
  timers: StartedTimers;
  // The recipe whose Learn mode is on screen, so its timers show in the app
  // instead of as phone notifications.
  onScreenRecipeId: string | null;
  // A tapped notification for the recipe on screen asks it to show a step.
  stepRequest: { recipeId: string; step: number } | null;

  begin: (recipeId: string) => void;
  updateTimers: (update: (timers: StartedTimers) => StartedTimers) => void;
  setOnScreen: (recipeId: string | null) => void;
  requestStep: (recipeId: string, step: number) => void;
  clearStepRequest: () => void;
};

export const useLearnStore = create<LearnState>((set) => ({
  recipeId: null,
  timers: {},
  onScreenRecipeId: null,
  stepRequest: null,

  begin: (recipeId) =>
    set((state) => (state.recipeId === recipeId ? state : { recipeId, timers: {} })),
  updateTimers: (update) => set((state) => ({ timers: update(state.timers) })),
  setOnScreen: (recipeId) => set({ onScreenRecipeId: recipeId }),
  requestStep: (recipeId, step) => set({ stepRequest: { recipeId, step } }),
  clearStepRequest: () => set({ stepRequest: null }),
}));
