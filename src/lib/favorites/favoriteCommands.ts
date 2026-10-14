// Saving and unsaving recipes (F04). Each change is stored on the phone
// with its outbox command in one transaction, before any request, whether
// the recipe page shows the server's copy or the phone's. Shared by the app
// and its tests, so nothing here imports React Native.
import type { SQLiteDatabase } from "expo-sqlite";
import { enqueueSyncOperation, type SyncQueueOperation } from "../../db/syncQueueRepository.ts";

type Dependencies = {
  db: SQLiteDatabase;
  // Runs `work` in one SQLite transaction (the app's runWriteTransaction).
  transact: <T>(work: (db: SQLiteDatabase) => Promise<T>) => Promise<T>;
  now: () => string;
  newId: (prefix: string) => string;
  // Asks the outbox to send what's queued now, if it can.
  requestSync: () => void;
};

export function createFavoriteCommands({ transact, now, newId, requestSync }: Dependencies) {
  return {
    async setFavorite(recipeId: string, favorite: boolean) {
      await transact(async (tx) => {
        const at = now();
        if (favorite) {
          await tx.runAsync(
            `
            INSERT INTO favorite_recipes (recipe_id, created_at, updated_at) VALUES (?, ?, ?)
            ON CONFLICT(recipe_id) DO UPDATE SET updated_at = excluded.updated_at
            `,
            [recipeId, at, at]
          );
        } else {
          await tx.runAsync("DELETE FROM favorite_recipes WHERE recipe_id = ?", [recipeId]);
        }
        await enqueueSyncOperation(
          tx,
          favorite ? "favorite_add" : "favorite_remove",
          { recipeId },
          { mutationId: newId("favorite_mutation"), entityId: recipeId }
        );
      });
      requestSync();
    },
  };
}

type FavoritesApi = {
  addFavorite: (recipeId: string) => Promise<unknown>;
  removeFavorite: (recipeId: string) => Promise<unknown>;
};

// Sends one favourite command from the outbox. Returns false for commands
// it doesn't handle. Both requests are safe to repeat.
export async function runFavoriteCommand(operation: SyncQueueOperation, api: FavoritesApi) {
  if (operation.kind !== "favorite_add" && operation.kind !== "favorite_remove") return false;
  const { recipeId } = operation.payload as { recipeId: string };
  await (operation.kind === "favorite_add" ? api.addFavorite(recipeId) : api.removeFavorite(recipeId));
  return true;
}

// The Saved list (F05): which recipes are saved comes from the phone (the
// server's list merged with changes not sent yet); their details come from
// the server's list when it has them, otherwise from the recipes on the
// phone.
export function savedRecipeList<T extends { id: string }>(
  membership: { recipeId: string }[],
  serverRecipes: T[] | undefined,
  localRecipes: T[]
) {
  return membership.flatMap(({ recipeId }) => {
    const recipe =
      serverRecipes?.find((item) => item.id === recipeId) ??
      localRecipes.find((item) => item.id === recipeId);
    return recipe ? [recipe] : [];
  });
}
