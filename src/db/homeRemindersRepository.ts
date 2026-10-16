import type { SQLiteDatabase } from "expo-sqlite";
import { runWithSqliteRetry } from "./sqliteGuards.ts";

// What this phone remembers about the Home reminders, per person so a shared
// phone doesn't mix two accounts up. Deleting the account forgets both
// (forgetAccount removes every key naming the person's id).

// Kept while the person's email shows as not confirmed: the day the last link
// was sent (or ""), so the app can tell them once it learns the email is
// confirmed.
const emailReminderKey = (userId: string) => `email_reminder:${userId}`;
// The Lagos day the profile card was dismissed.
const profileReminderKey = (userId: string) => `profile_reminder_dismissed:${userId}`;

async function readValue(db: SQLiteDatabase, key: string) {
  return runWithSqliteRetry(async () => {
    const row = await db.getFirstAsync<{ value: string }>("SELECT value FROM local_metadata WHERE key = ?", [key]);
    return row?.value ?? null;
  });
}

async function writeValue(db: SQLiteDatabase, key: string, value: string) {
  await runWithSqliteRetry(() =>
    db.runAsync(
      `INSERT INTO local_metadata (key, value, updated_at) VALUES (?, ?, ?)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
      [key, value, new Date().toISOString()]
    )
  );
}

// null: not shown as unconfirmed on this phone. Otherwise the day the last
// link was sent, or null for none yet.
export async function getEmailReminder(db: SQLiteDatabase, userId: string) {
  const value = await readValue(db, emailReminderKey(userId));
  return value === null ? null : { sentOn: value || null };
}

export async function saveEmailReminder(db: SQLiteDatabase, userId: string, sentOn: string | null) {
  await writeValue(db, emailReminderKey(userId), sentOn ?? "");
}

export async function clearEmailReminder(db: SQLiteDatabase, userId: string) {
  await runWithSqliteRetry(() => db.runAsync("DELETE FROM local_metadata WHERE key = ?", [emailReminderKey(userId)]));
}

export async function getProfileReminderDismissedOn(db: SQLiteDatabase, userId: string) {
  return readValue(db, profileReminderKey(userId));
}

export async function saveProfileReminderDismissedOn(db: SQLiteDatabase, userId: string, day: string) {
  await writeValue(db, profileReminderKey(userId), day);
}
