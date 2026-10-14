// How many servings a recipe, a list or a default can be set to (SRV-01).
// The server's MAX_SERVINGS is the same, so anything the app accepts it
// accepts too. Shared by the app and its tests, so nothing here imports
// React Native.
export const MIN_SERVINGS = 1;
export const MAX_SERVINGS = 500;

export function clampServings(servings: number) {
  return Math.max(MIN_SERVINGS, Math.min(MAX_SERVINGS, Math.round(servings)));
}

// − and +: one at a time, stopping at the limits.
export function stepServings(current: number, step: 1 | -1) {
  return clampServings(current + step);
}

// What someone typed in the servings field: a number to use, or a short
// message saying what to type instead. Nothing typed is changed for them.
export function parseServingsInput(text: string): { value: number } | { error: string } {
  const trimmed = text.trim();
  if (trimmed === "") return { error: "Enter how many servings." };
  if (!/^\d+$/.test(trimmed)) return { error: "Enter a whole number, like 4." };
  const value = Number(trimmed);
  if (value < MIN_SERVINGS) return { error: "The fewest is 1 serving." };
  if (value > MAX_SERVINGS) return { error: `The most is ${MAX_SERVINGS} servings.` };
  return { value };
}
