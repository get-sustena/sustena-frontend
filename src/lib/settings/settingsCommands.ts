// Preferences, profile answers and planner settings (QAD-01, QAD-04). A
// change is saved on the phone with its outbox command in one transaction,
// before any request; changes made before the first is sent go as one
// update. Replies from the server never undo a change not sent yet. Shared
// by the app and its tests, so nothing here imports React Native.
import type { SQLiteDatabase } from "expo-sqlite";
import { enqueueSyncOperation, type SyncQueueOperation } from "../../db/syncQueueRepository.ts";

type SettingsKind = "preferences_update" | "profile_answers_update" | "planner_settings_update";

type Dependencies = {
  db: SQLiteDatabase;
  // Runs `work` in one SQLite transaction (the app's runWriteTransaction).
  transact: <T>(work: (db: SQLiteDatabase) => Promise<T>) => Promise<T>;
  newId: (prefix: string) => string;
  // Asks the outbox to send what's queued now, if it can.
  requestSync: () => void;
};

// The unsent changes of one kind, oldest first, as one change.
async function pendingChange(db: SQLiteDatabase, kind: SettingsKind) {
  const rows = await db.getAllAsync<{ id: string; payload_json: string }>(
    "SELECT id, payload_json FROM sync_queue WHERE kind = ? ORDER BY created_at ASC, rowid ASC",
    [kind]
  );
  const change = Object.assign({}, ...rows.map((row) => JSON.parse(row.payload_json) as object));
  return { ids: rows.map((row) => row.id), change: rows.length ? change : null };
}

export function createSettingsCommands({ transact, newId, requestSync }: Dependencies) {
  return {
    // `writeLocal` saves the whole setting on the phone; `change` is what
    // the server is sent.
    async save(kind: SettingsKind, change: object, writeLocal: (tx: SQLiteDatabase) => Promise<void>) {
      await transact(async (tx) => {
        await writeLocal(tx);
        const pending = await pendingChange(tx, kind);
        for (const id of pending.ids) await tx.runAsync("DELETE FROM sync_queue WHERE id = ?", [id]);
        await enqueueSyncOperation(
          tx,
          kind,
          { ...pending.change, ...change },
          { mutationId: newId("settings_mutation"), entityId: kind }
        );
      });
      requestSync();
    },
  };
}

// A reply from the server, with the changes not sent yet on top.
export async function withPendingSettings<T extends object>(db: SQLiteDatabase, kind: SettingsKind, server: T): Promise<T> {
  const { change } = await pendingChange(db, kind);
  return change ? { ...server, ...change } : server;
}

type SettingsApi = {
  updatePreferences: (change: never) => Promise<unknown>;
  updateProfileAnswers: (change: never) => Promise<unknown>;
  updatePlannerSettings: (change: never) => Promise<unknown>;
};

const SEND: Record<SettingsKind, keyof SettingsApi> = {
  preferences_update: "updatePreferences",
  profile_answers_update: "updateProfileAnswers",
  planner_settings_update: "updatePlannerSettings",
};

// Sends one settings change from the outbox. Returns false for commands it
// doesn't handle.
export async function runSettingsCommand(operation: SyncQueueOperation, api: SettingsApi) {
  const send = SEND[operation.kind as SettingsKind];
  if (!send) return false;
  await api[send](operation.payload as never);
  return true;
}
