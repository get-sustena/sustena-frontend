import { type SQLiteDatabase } from "expo-sqlite";
import { RecipeDraftWriteRequest } from "../types/api";

export type CachedCreatorRecipeDraft = {
  id: string;
  revision: number | null;
  payload: RecipeDraftWriteRequest;
  syncStatus: "synced" | "pending" | "conflict";
  lastError: string | null;
  updatedAt: string;
};

type CachedCreatorRecipeDraftRow = {
  id: string;
  revision: number | null;
  payload_json: string;
  sync_status: CachedCreatorRecipeDraft["syncStatus"];
  last_error: string | null;
  updated_at: string;
};

export async function cacheCreatorRecipeDraft(
  db: SQLiteDatabase,
  draft: Omit<CachedCreatorRecipeDraft, "updatedAt">
) {
  const updatedAt = new Date().toISOString();
  await db.runAsync(
    `
    INSERT INTO creator_recipe_drafts (
      id, revision, payload_json, sync_status, last_error, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      revision = excluded.revision,
      payload_json = excluded.payload_json,
      sync_status = excluded.sync_status,
      last_error = excluded.last_error,
      updated_at = excluded.updated_at
    `,
    [
      draft.id,
      draft.revision,
      JSON.stringify(draft.payload),
      draft.syncStatus,
      draft.lastError,
      updatedAt,
    ]
  );
}

export async function getCachedCreatorRecipeDraft(
  db: SQLiteDatabase,
  id: string
) {
  const row = await db.getFirstAsync<CachedCreatorRecipeDraftRow>(
    "SELECT * FROM creator_recipe_drafts WHERE id = ?",
    [id]
  );

  return row ? fromRow(row) : null;
}

export async function getPendingCreatorRecipeDrafts(db: SQLiteDatabase) {
  const rows = await db.getAllAsync<CachedCreatorRecipeDraftRow>(
    `
    SELECT * FROM creator_recipe_drafts
    WHERE sync_status = 'pending'
    ORDER BY updated_at ASC
    `
  );

  return rows.map(fromRow);
}

export async function deleteCachedCreatorRecipeDraft(
  db: SQLiteDatabase,
  id: string
) {
  await db.runAsync("DELETE FROM creator_recipe_drafts WHERE id = ?", [id]);
}

function fromRow(row: CachedCreatorRecipeDraftRow): CachedCreatorRecipeDraft {
  return {
    id: row.id,
    revision: row.revision,
    payload: JSON.parse(row.payload_json) as RecipeDraftWriteRequest,
    syncStatus: row.sync_status,
    lastError: row.last_error,
    updatedAt: row.updated_at,
  };
}
