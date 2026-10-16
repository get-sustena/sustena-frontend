// Your stars for a recipe (PRD v6.9 section 20). A rating waits in the
// outbox, so it works offline, and until it's sent the newest one queued for
// a recipe is what the app shows. Shared by the app and its tests, so nothing
// here imports React Native.
import type { SQLiteDatabase } from "expo-sqlite";
import { enqueueSyncOperation, type SyncQueueOperation } from "../../db/syncQueueRepository.ts";

type Dependencies = {
  db: SQLiteDatabase;
  newId: (prefix: string) => string;
  requestSync: () => void;
};

export function createRatingCommands({ db, newId, requestSync }: Dependencies) {
  return {
    async rate(recipeId: string, rating: number) {
      await enqueueSyncOperation(
        db,
        "recipe_rate",
        { recipeId, rating },
        { mutationId: newId("rating_mutation"), entityId: recipeId }
      );
      requestSync();
    },
  };
}

// Recipe id → stars, for ratings not sent yet.
export async function pendingRatings(db: SQLiteDatabase) {
  const rows = await db.getAllAsync<{ entity_id: string; payload_json: string }>(
    `SELECT entity_id, payload_json FROM sync_queue
     WHERE kind = 'recipe_rate' AND needs_attention = 0
     ORDER BY created_at, rowid`
  );
  return new Map(rows.map((row) => [row.entity_id, (JSON.parse(row.payload_json) as { rating: number }).rating]));
}

type RatingApi = {
  rateRecipe: (recipeId: string, rating: number) => Promise<unknown>;
};

// Sends one rating from the outbox. Returns false for commands it doesn't
// handle. Sending the same stars again changes nothing.
export async function runRatingCommand(operation: SyncQueueOperation, api: RatingApi) {
  if (operation.kind !== "recipe_rate") return false;
  const { recipeId, rating } = operation.payload as { recipeId: string; rating: number };
  try {
    await api.rateRecipe(recipeId, rating);
  } catch (error) {
    // A recipe that's gone (404): sending it again can't change anything.
    if ((error as { status?: number } | null)?.status !== 404) throw error;
  }
  return true;
}
