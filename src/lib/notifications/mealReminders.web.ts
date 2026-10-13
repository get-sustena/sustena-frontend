import type { SQLiteDatabase } from "expo-sqlite";

// Expo push only reaches phones, so the web app has no meal reminders and
// hides the Settings switch. These keep the shared callers simple.

type EnableMealRemindersResult = "enabled" | "denied" | "failed";

export function configureMealReminderNotifications() {}

export async function enableMealReminders(
  _db: SQLiteDatabase
): Promise<EnableMealRemindersResult> {
  return "failed";
}

export async function refreshMealReminders(_db: SQLiteDatabase) {
  return false;
}

export async function disableMealReminders(_db: SQLiteDatabase) {}

export function onPushTokenChange(_listener: () => void) {
  return () => {};
}

export function onMealReminderOpened(_open: (recipeId: string) => void) {
  return () => {};
}
