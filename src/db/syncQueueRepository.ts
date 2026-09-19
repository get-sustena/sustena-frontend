// src/db/syncQueueRepository.ts

import { type SQLiteDatabase } from "expo-sqlite";
import { createLocalId } from "../lib/id";

export type SyncQueueKind =
  | "favorite_add"
  | "favorite_remove"
  | "shopping_toggle"
  | "shopping_clear_checked"
  | "shopping_add"
  | "shopping_remove"
  | "profile_answers_update"
  | "planner_settings_update"
  | "shopping_list_item_add"
  | "shopping_list_item_toggle"
  | "shopping_list_item_remove"
  | "shopping_list_recipe_batch";

export type SyncQueueOperation = {
  id: string;
  kind: SyncQueueKind;
  payload: unknown;
  createdAt: string;
  attempts: number;
};

type SyncQueueRow = {
  id: string;
  kind: SyncQueueKind;
  payload_json: string;
  created_at: string;
  attempts: number;
};

export async function enqueueSyncOperation(
  db: SQLiteDatabase,
  kind: SyncQueueKind,
  payload: unknown
) {
  await db.runAsync(
    `
    INSERT INTO sync_queue (id, kind, payload_json, created_at, attempts)
    VALUES (?, ?, ?, ?, 0)
    `,
    [createLocalId("sync"), kind, JSON.stringify(payload), new Date().toISOString()]
  );
}

export async function getPendingSyncOperations(
  db: SQLiteDatabase
): Promise<SyncQueueOperation[]> {
  const rows = await db.getAllAsync<SyncQueueRow>(
    `
    SELECT *
    FROM sync_queue
    ORDER BY created_at ASC
    `
  );

  return rows.map((row) => ({
    id: row.id,
    kind: row.kind,
    payload: JSON.parse(row.payload_json),
    createdAt: row.created_at,
    attempts: row.attempts,
  }));
}

export async function deleteSyncOperation(db: SQLiteDatabase, id: string) {
  await db.runAsync(`DELETE FROM sync_queue WHERE id = ?`, [id]);
}

export async function incrementSyncAttempt(db: SQLiteDatabase, id: string) {
  await db.runAsync(
    `UPDATE sync_queue SET attempts = attempts + 1 WHERE id = ?`,
    [id]
  );
}

export async function cancelQueuedShoppingListItemRemoval(
  db: SQLiteDatabase,
  listId: string,
  itemId: string
) {
  const operations = await getPendingSyncOperations(db);
  await Promise.all(
    operations
      .filter((operation) => {
        if (operation.kind !== "shopping_list_item_remove") return false;
        const payload = operation.payload as { listId?: string; itemId?: string };
        return payload.listId === listId && payload.itemId === itemId;
      })
      .map((operation) => deleteSyncOperation(db, operation.id))
  );
}
