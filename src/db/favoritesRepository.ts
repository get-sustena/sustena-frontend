
import { type SQLiteDatabase } from "expo-sqlite";
import { FavoriteRecipe } from "../types/favorite";

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

export async function insertFavoriteRecipe(
  db: SQLiteDatabase,
  recipeId: string
) {
  const now = new Date().toISOString();

  await db.runAsync(
    `
    INSERT INTO favorite_recipes (
      recipe_id,
      created_at,
      updated_at
    )
    VALUES (?, ?, ?)
    ON CONFLICT(recipe_id) DO UPDATE SET
      updated_at = excluded.updated_at
    `,
    [recipeId, now, now]
  );
}

export async function deleteFavoriteRecipe(
  db: SQLiteDatabase,
  recipeId: string
) {
  await db.runAsync(
    `
    DELETE FROM favorite_recipes
    WHERE recipe_id = ?
    `,
    [recipeId]
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
