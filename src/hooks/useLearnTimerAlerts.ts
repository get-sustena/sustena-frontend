import { router } from "expo-router";
import { useEffect } from "react";
import { onTimerAlertOpened } from "../lib/learnMode/timerAlerts";
import { useLearnStore } from "../store/learnStore";

// A tapped timer notification opens its step: straight away when that
// recipe's Learn mode is on screen, otherwise through the recipe page.
export function useLearnTimerAlerts() {
  useEffect(
    () =>
      onTimerAlertOpened(({ recipeId, step, source }) => {
        const learn = useLearnStore.getState();
        if (learn.onScreenRecipeId === recipeId) {
          learn.requestStep(recipeId, step);
          return;
        }
        router.push({
          pathname: "/recipes/[id]",
          params: { id: recipeId, learnStep: String(step), ...(source ? { source } : {}) },
        });
      }),
    []
  );
}
