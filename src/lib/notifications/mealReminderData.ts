// Shared by the app and its tests, so nothing here imports React Native.

// The Android channel the backend sends meal reminders to (its contract,
// 13 October 2026). Settings > Notifications on the phone shows its name.
export const MEAL_REMINDER_CHANNEL_ID = "meal-reminders";

// Sent as `source` on GET /recipes/{id} when a reminder opens a recipe.
export const MEAL_REMINDER_SOURCE = "meal_reminder";

const FALLBACK_TIME_ZONE = "Africa/Lagos";

// The recipe a tapped meal reminder points at. Anything else, such as a
// future order update, gives null so the tap is left alone.
export function getMealReminderRecipeId(data: unknown): string | null {
  if (typeof data !== "object" || data === null) return null;
  const { type, recipeId } = data as { type?: unknown; recipeId?: unknown };
  if (type !== "meal-reminder") return null;
  return typeof recipeId === "string" && recipeId.length > 0 ? recipeId : null;
}

// The phone's IANA time zone for the backend's 8am, 1pm and 5pm sends.
// Lagos is the fallback because every Sustena customer is in Nigeria today.
export function getDeviceTimeZone(
  resolve: () => string | undefined = () => Intl.DateTimeFormat().resolvedOptions().timeZone
): string {
  try {
    return resolve() || FALLBACK_TIME_ZONE;
  } catch {
    return FALLBACK_TIME_ZONE;
  }
}
