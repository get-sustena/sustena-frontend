// "I cooked it" (PRD v6.8 section 16), with or without a connection. The
// tap is stored on the phone with its outbox command in one transaction, so
// the button reads "Cooked today" at once and the server hears of it when
// the phone is back online. Shared by the app and its tests, so nothing here
// imports React Native.
import type { SQLiteDatabase } from "expo-sqlite";
import { cookedDayKey } from "../../db/cookedRecipesRepository.ts";
import { enqueueSyncOperation, type SyncQueueOperation } from "../../db/syncQueueRepository.ts";
import { getLagosDay } from "../lagosDay.ts";
import type { RecipeSource } from "../recipeSource.ts";

type Dependencies = {
  db: SQLiteDatabase;
  // Runs `work` in one SQLite transaction (the app's runWriteTransaction).
  transact: <T>(work: (db: SQLiteDatabase) => Promise<T>) => Promise<T>;
  now: () => Date;
  newId: (prefix: string) => string;
  // Asks the outbox to send what's queued now, if it can.
  requestSync: () => void;
};

type Cook = { userId: string; recipeId: string; source?: RecipeSource };

export function createCookedCommands({ transact, now, newId, requestSync }: Dependencies) {
  return {
    // Once per person, recipe and Lagos day, like the server's count.
    async markCooked({ userId, recipeId, source }: Cook) {
      const at = now();
      const today = getLagosDay(at);
      const queued = await transact(async (tx) => {
        const key = cookedDayKey(userId, recipeId);
        const saved = await tx.getFirstAsync<{ value: string }>(
          "SELECT value FROM local_metadata WHERE key = ?",
          [key]
        );
        if (saved?.value === today) return false;

        await tx.runAsync(
          `
          INSERT INTO local_metadata (key, value, updated_at) VALUES (?, ?, ?)
          ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at
          `,
          [key, today, at.toISOString()]
        );
        // The time of the tap travels with it, so a cook sent after a late
        // reconnect counts on the day it happened.
        await enqueueSyncOperation(
          tx,
          "recipe_cooked",
          { recipeId, source, cookedAt: at.toISOString(), userId },
          { mutationId: newId("cooked_mutation"), entityId: recipeId }
        );
        return true;
      });
      if (queued) requestSync();
      return today;
    },
  };
}

type CookedApi = {
  markRecipeCooked: (recipeId: string, source?: RecipeSource, cookedAt?: string) => Promise<unknown>;
};

// The server refuses a cook timed more than 5 minutes ahead or more than 30
// days back. Such a tap can never count, so it's dropped rather than kept
// for repair.
const UNCOUNTABLE = new Set(["COOKED_AT_IN_FUTURE", "COOKED_AT_TOO_OLD"]);

// Sends one cook from the outbox. The server counts once per person, recipe
// and Lagos day of `cookedAt`, so sending it again can't count it twice.
// Returns false for commands it doesn't handle.
export async function runCookedCommand(operation: SyncQueueOperation, api: CookedApi) {
  if (operation.kind !== "recipe_cooked") return false;
  const { recipeId, source, cookedAt } = operation.payload as {
    recipeId: string;
    source?: RecipeSource;
    cookedAt?: string;
  };
  try {
    await api.markRecipeCooked(recipeId, source, cookedAt);
  } catch (error) {
    const code = (error as { code?: unknown }).code;
    if (typeof code !== "string" || !UNCOUNTABLE.has(code)) throw error;
  }
  return true;
}
