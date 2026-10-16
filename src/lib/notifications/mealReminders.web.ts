import type { SQLiteDatabase } from "expo-sqlite";

// Expo push only reaches phones, so the web app has no meal reminders and
// hides the Settings switch. These keep the shared callers simple.

type EnableMealRemindersResult = "enabled" | "denied" | "failed";

export async function enableMealReminders(
  _db: SQLiteDatabase
): Promise<EnableMealRemindersResult> {
  return "failed";
}

export async function refreshMealReminders(_db: SQLiteDatabase) {
  return false;
}

export async function disableMealReminders(_db: SQLiteDatabase) {}

export async function forgetMealReminders(_db: SQLiteDatabase) {}

export function registerNewPushTokens(_db: SQLiteDatabase) {
  return () => {};
}

export function onMealReminderOpened(_open: (recipeId: string) => void) {
  return () => {};
}
