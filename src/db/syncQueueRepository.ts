
import type { SQLiteDatabase } from "expo-sqlite";
import { createLocalId } from "../lib/id.ts";

export type SyncQueueKind =
  | "favorite_add"
  | "favorite_remove"
  | "shopping_toggle"
  | "shopping_clear_checked"
  | "shopping_add"
  | "shopping_remove"
  | "profile_answers_update"
  | "planner_settings_update"
  | "preferences_update"
  | "shopping_list_item_add"
  | "shopping_list_item_toggle"
  | "shopping_list_item_update"
  | "shopping_list_items_set_checked"
  | "shopping_list_item_remove"
  | "shopping_list_item_restore"
  | "shopping_list_clear_checked"
  | "shopping_list_recipe_batch"
  | "shopping_list_create"
  | "shopping_list_rename"
  | "shopping_list_delete"
  | "meal_plan_create"
  | "meal_plan_rename"
  | "meal_plan_swap"
  | "meal_plan_delete"
  | "recipe_cooked";

export type SyncQueueOperation = {
  id: string;
  kind: SyncQueueKind;
  payload: unknown;
  createdAt: string;
  attempts: number;
  nextAttemptAt: number | null;
  needsAttention: boolean;
  version: number;
  // Stays the same across retries, so the server can tell a retry from a
  // new change.
  mutationId: string | null;
  // The entity this command creates or changes.
  entityId: string | null;
  // An entity created offline that must reach the server first.
  dependsOn: string | null;
};

type SyncQueueRow = {
  id: string;
  kind: SyncQueueKind;
  payload_json: string;
  created_at: string;
  attempts: number;
  next_attempt_at: number | null;
  needs_attention: number;
  command_version: number;
  mutation_id: string | null;
  entity_id: string | null;
  depends_on: string | null;
};

// The outbox command format. Bump when a payload's shape changes, and teach
// replay to read the older version.
const COMMAND_VERSION = 1;

type CommandOptions = {
  mutationId?: string;
  entityId?: string;
  dependsOn?: string | null;
};

export async function enqueueSyncOperation(
  db: SQLiteDatabase,
  kind: SyncQueueKind,
  payload: unknown,
  { mutationId, entityId, dependsOn }: CommandOptions = {}
) {
  await db.runAsync(
    `
    INSERT INTO sync_queue (
      id, kind, payload_json, created_at, attempts,
      command_version, mutation_id, entity_id, depends_on
    )
    VALUES (?, ?, ?, ?, 0, ?, ?, ?, ?)
    `,
    [
      createLocalId("sync"),
      kind,
      JSON.stringify(payload),
      new Date().toISOString(),
      COMMAND_VERSION,
      mutationId ?? null,
      entityId ?? null,
      dependsOn ?? null,
    ]
  );
}

export async function getPendingSyncOperations(
  db: SQLiteDatabase
): Promise<SyncQueueOperation[]> {
  const rows = await db.getAllAsync<SyncQueueRow>(
    `
    SELECT *
    FROM sync_queue
    ORDER BY created_at ASC, rowid ASC
    `
  );

  return rows.map((row) => ({
    id: row.id,
    kind: row.kind,
    payload: JSON.parse(row.payload_json),
    createdAt: row.created_at,
    attempts: row.attempts,
    nextAttemptAt: row.next_attempt_at,
    needsAttention: row.needs_attention === 1,
    version: row.command_version,
    mutationId: row.mutation_id,
    entityId: row.entity_id,
    dependsOn: row.depends_on,
  }));
}

export async function deleteSyncOperation(db: SQLiteDatabase, id: string) {
  await db.runAsync(`DELETE FROM sync_queue WHERE id = ?`, [id]);
}

// After a temporary failure: one more attempt, and when to try again.
export async function scheduleSyncRetry(db: SQLiteDatabase, id: string, nextAttemptAt: number) {
  await db.runAsync(
    `UPDATE sync_queue SET attempts = attempts + 1, next_attempt_at = ? WHERE id = ?`,
    [nextAttemptAt, id]
  );
}

// After a permanent failure: kept for repair, and no longer retried.
export async function markSyncNeedsAttention(db: SQLiteDatabase, id: string, reason: string) {
  await db.runAsync(
    `UPDATE sync_queue SET needs_attention = 1, last_error = ? WHERE id = ?`,
    [reason, id]
  );
}
