// Shared by the app and its tests, so nothing here imports React Native.
import { readRecipeSource, type RecipeSource } from "../recipeSource.ts";

// The Android channel for Learn mode timers. Settings > Notifications on the
// phone shows its name.
export const LEARN_TIMER_CHANNEL_ID = "learn-timers";

// Where a tapped timer notification goes: the recipe's Learn mode, at a step.
export type TimerAlertTarget = {
  recipeId: string;
  step: number;
  source?: RecipeSource;
};

// One notification per timer, so restarting a timer replaces its notification.
export function timerAlertId(recipeId: string, key: string) {
  return `learn-timer:${recipeId}:${key}`;
}

export function timerAlertData(target: TimerAlertTarget) {
  return { type: "learn-timer", ...target };
}

// The target of a tapped notification, or null when it isn't a Learn mode timer.
export function getTimerAlertTarget(data: unknown): TimerAlertTarget | null {
  if (typeof data !== "object" || data === null) return null;
  const { type, recipeId, step, source } = data as Record<string, unknown>;
  if (type !== "learn-timer") return null;
  if (typeof recipeId !== "string" || !recipeId) return null;
  if (typeof step !== "number" || !Number.isInteger(step) || step < 0) return null;
  return { recipeId, step, source: readRecipeSource(source) };
}

// The recipe page link that opens Learn mode at a step.
export function learnModeHref({ recipeId, step, source }: TimerAlertTarget) {
  const query = new URLSearchParams({ learnStep: String(step) });
  if (source) query.set("source", source);
  return `/recipes/${encodeURIComponent(recipeId)}?${query}`;
}
