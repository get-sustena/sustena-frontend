// Shared by the app and its tests, so nothing here imports React Native.
import type { SQLiteDatabase } from "expo-sqlite";
import {
  deleteSyncOperation,
  getPendingSyncOperations,
  markSyncNeedsAttention,
  scheduleSyncRetry,
  type SyncQueueOperation,
} from "../../db/syncQueueRepository.ts";
import { replayQueue } from "./syncReplay.ts";

type ReplayOptions = Parameters<typeof replayQueue>[1];

// Replays the outbox (the sync_queue table) under the rules in
// syncReplay.ts. `run` sends one command to the server.
export function replayOutbox(
  db: SQLiteDatabase,
  run: (db: SQLiteDatabase, operation: SyncQueueOperation) => Promise<void>,
  options: ReplayOptions
) {
  return replayQueue<SyncQueueOperation>(
    {
      pending: () => getPendingSyncOperations(db),
      run: (operation) => run(db, operation),
      remove: (id) => deleteSyncOperation(db, id),
      scheduleRetry: (id, nextAttemptAt) => scheduleSyncRetry(db, id, nextAttemptAt),
      markNeedsAttention: (id, reason) => markSyncNeedsAttention(db, id, reason),
    },
    options
  );
}
