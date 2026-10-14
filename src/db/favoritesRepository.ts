
import type { SQLiteDatabase } from "expo-sqlite";
import type { FavoriteRecipe } from "../types/favorite.ts";

type FavoriteRecipeRow = {
  recipe_id: string;
  created_at: string;
  updated_at: string;
};

export async function getStoredFavorites(db: SQLiteDatabase) {
  return db.getAllAsync<FavoriteRecipeRow>(
    `
    SELECT *
    FROM favorite_recipes
    ORDER BY created_at DESC
    `
  );
}

export function mapFavoriteRowToFavorite(
  row: FavoriteRecipeRow
): FavoriteRecipe {
  return {
    recipeId: row.recipe_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// Saves the server's list of saved recipes (QAD-01). A reply can be older
// than changes made on the phone, so saves and unsaves still in the outbox
// win. Returns the recipe ids now saved.
export async function replaceFavoritesKeepingPendingEdits(
  tx: SQLiteDatabase,
  serverRecipeIds: string[],
  now: string
) {
  const pending = await tx.getAllAsync<{ kind: string; entity_id: string | null }>(
    `
    SELECT kind, entity_id
    FROM sync_queue
    WHERE kind IN ('favorite_add', 'favorite_remove')
    ORDER BY created_at ASC, rowid ASC
    `
  );
  const saved = new Set(serverRecipeIds);
  for (const operation of pending) {
    if (!operation.entity_id) continue;
    if (operation.kind === "favorite_add") saved.add(operation.entity_id);
    else saved.delete(operation.entity_id);
  }

  const ids = JSON.stringify([...saved]);
  await tx.runAsync("DELETE FROM favorite_recipes WHERE recipe_id NOT IN (SELECT value FROM json_each(?))", [ids]);
  for (const recipeId of saved) {
    await tx.runAsync(
      "INSERT INTO favorite_recipes (recipe_id, created_at, updated_at) VALUES (?, ?, ?) ON CONFLICT(recipe_id) DO NOTHING",
      [recipeId, now, now]
    );
  }
  return [...saved];
}
