import type { SQLiteDatabase } from "expo-sqlite";
import { runWithSqliteRetry } from "./sqliteGuards";

const WELCOME_SEEN_KEY = "welcome_seen";

export async function getHasSeenWelcome(db: SQLiteDatabase) {
  return runWithSqliteRetry(async () => {
    const result = await db.getFirstAsync<{ value: string }>(
      "SELECT value FROM local_metadata WHERE key = ?",
      [WELCOME_SEEN_KEY]
    );

    return result?.value === "1";
  });
}

export async function markWelcomeSeen(db: SQLiteDatabase) {
  await runWithSqliteRetry(async () => {
    const now = new Date().toISOString();

    await db.runAsync(
      `
      INSERT INTO local_metadata (key, value, updated_at)
      VALUES (?, ?, ?)
      ON CONFLICT(key) DO UPDATE SET
        value = excluded.value,
        updated_at = excluded.updated_at
      `,
      [WELCOME_SEEN_KEY, "1", now]
    );
  });
}
