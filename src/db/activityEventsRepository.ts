import type { SQLiteDatabase } from "expo-sqlite";

type ActivityEventRow = {
  client_event_id: string;
  type: string;
  occurred_at: string;
  properties_json: string;
};

export async function insertActivityEvent(
  db: SQLiteDatabase,
  event: { clientEventId: string; userId: string; type: string; occurredAt: string; properties: object }
) {
  await db.runAsync(
    `INSERT INTO activity_events (client_event_id, user_id, type, occurred_at, properties_json)
     VALUES (?, ?, ?, ?, ?)`,
    [event.clientEventId, event.userId, event.type, event.occurredAt, JSON.stringify(event.properties)]
  );
}

// The oldest first, one account's only.
export function listActivityEvents(db: SQLiteDatabase, userId: string, limit: number) {
  return db.getAllAsync<ActivityEventRow>(
    `SELECT client_event_id, type, occurred_at, properties_json FROM activity_events
     WHERE user_id = ? ORDER BY occurred_at, rowid LIMIT ?`,
    [userId, limit]
  );
}

export async function deleteActivityEvents(db: SQLiteDatabase, clientEventIds: string[]) {
  if (clientEventIds.length === 0) return;
  await db.runAsync(
    `DELETE FROM activity_events WHERE client_event_id IN (${clientEventIds.map(() => "?").join(", ")})`,
    clientEventIds
  );
}

// Every account's, so nothing waits forever for an account that never signs in again.
export async function deleteActivityEventsBefore(db: SQLiteDatabase, occurredAt: string) {
  await db.runAsync("DELETE FROM activity_events WHERE occurred_at < ?", [occurredAt]);
}
