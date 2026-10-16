// Following a creator ("Follow" replaced "Save creator", founder, 16 October
// 2026). The server still calls it saving: POST and DELETE
// /creators/{id}/save. A follow or unfollow waits in the outbox, so it works
// offline, and until it's sent the newest one queued for a creator is what
// the app shows. Shared by the app and its tests, so nothing here imports
// React Native.
import type { SQLiteDatabase } from "expo-sqlite";
import { enqueueSyncOperation, type SyncQueueOperation } from "../../db/syncQueueRepository.ts";

type Dependencies = {
  db: SQLiteDatabase;
  newId: (prefix: string) => string;
  // Asks the outbox to send what's queued now, if it can.
  requestSync: () => void;
};

export function createFollowCommands({ db, newId, requestSync }: Dependencies) {
  return {
    async setFollowing(creatorId: string, following: boolean) {
      await enqueueSyncOperation(
        db,
        following ? "creator_follow" : "creator_unfollow",
        { creatorId },
        { mutationId: newId("follow_mutation"), entityId: creatorId }
      );
      requestSync();
    },
  };
}

// Creator id → following, for follows and unfollows not sent yet.
export async function pendingFollows(db: SQLiteDatabase) {
  const rows = await db.getAllAsync<{ kind: string; entity_id: string }>(
    `SELECT kind, entity_id FROM sync_queue
     WHERE kind IN ('creator_follow', 'creator_unfollow') AND needs_attention = 0
     ORDER BY created_at, rowid`
  );
  return new Map(rows.map((row) => [row.entity_id, row.kind === "creator_follow"]));
}

// What the server last said, with a follow or unfollow not sent yet applied.
export function followState(
  server: { following: boolean; followerCount?: number },
  pending: boolean | undefined
) {
  const following = pending ?? server.following;
  const followerCount =
    server.followerCount === undefined
      ? undefined
      : Math.max(0, server.followerCount + Number(following) - Number(server.following));
  return { following, followerCount };
}

type FollowApi = {
  saveCreator: (creatorId: string) => Promise<unknown>;
  unsaveCreator: (creatorId: string) => Promise<unknown>;
};

// Sends one follow command from the outbox. Returns false for commands it
// doesn't handle. Both requests are safe to repeat.
export async function runFollowCommand(operation: SyncQueueOperation, api: FollowApi) {
  if (operation.kind !== "creator_follow" && operation.kind !== "creator_unfollow") return false;
  const { creatorId } = operation.payload as { creatorId: string };
  try {
    await (operation.kind === "creator_follow" ? api.saveCreator(creatorId) : api.unsaveCreator(creatorId));
  } catch (error) {
    if (!nothingToSend(error)) throw error;
  }
  return true;
}

// Your own profile (422 CANNOT_SAVE_SELF) or a creator that's gone (404):
// sending it again can't change anything.
function nothingToSend(error: unknown) {
  const { status, code } = (error ?? {}) as { status?: number; code?: string };
  return status === 404 || (status === 422 && code === "CANNOT_SAVE_SELF");
}
