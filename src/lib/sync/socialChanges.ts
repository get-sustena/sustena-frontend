// Follow, save and rating changes the server refused (PRD v6.9 section 20).
// Unlike other refused edits, these aren't kept for "Changes not saved": the
// button goes back and a toast offers Try again. Shared by the app and its
// tests, so nothing here imports React Native.
import type { SQLiteDatabase } from "expo-sqlite";
import { discardChange } from "./outboxRepair.ts";

export type RefusedSocialChange =
  | { kind: "favorite_add" | "favorite_remove"; recipeId: string }
  | { kind: "creator_follow" | "creator_unfollow"; creatorId: string; name: string }
  | { kind: "recipe_rate"; recipeId: string; rating: number };

const SOCIAL_KINDS = ["favorite_add", "favorite_remove", "creator_follow", "creator_unfollow", "recipe_rate"];

// Drops each refused change and undoes it on the phone, oldest first, and
// returns what they were. Run it inside a transaction.
export async function dropRefusedSocialChanges(tx: SQLiteDatabase): Promise<RefusedSocialChange[]> {
  const rows = await tx.getAllAsync<{ id: string; kind: string; payload_json: string }>(
    `SELECT id, kind, payload_json FROM sync_queue
     WHERE needs_attention = 1 AND kind IN (${SOCIAL_KINDS.map(() => "?").join(", ")})
     ORDER BY created_at, rowid`,
    SOCIAL_KINDS
  );
  const dropped: RefusedSocialChange[] = [];
  for (const row of rows) {
    await discardChange(tx, row.id);
    dropped.push({ kind: row.kind, ...JSON.parse(row.payload_json) } as RefusedSocialChange);
  }
  return dropped;
}
