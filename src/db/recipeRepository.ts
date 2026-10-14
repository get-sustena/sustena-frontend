import { type SQLiteDatabase } from "expo-sqlite";
import { applyBundledSeedIfNew } from "../lib/catalogue/recipeCatalogueSync";
import { RecipeDetail } from "../types/api";
import { bundledRecipeCatalogue } from "./recipeSeed";
import { replaceRecipeChildren, upsertRecipe } from "./recipeRows";
import { runWithSqliteRetry } from "./sqliteGuards";
import { runWriteTransaction } from "./writeTransaction";

// Saves the catalogue bundled with this build, once per build, so recipes
// open on a first start with no connection.
export async function applyBundledRecipeSeed(db: SQLiteDatabase) {
  await runWithSqliteRetry(() =>
    applyBundledSeedIfNew(
      {
        db,
        transact: (work) => runWriteTransaction(db, work),
        now: () => new Date().toISOString(),
      },
      bundledRecipeCatalogue
    )
  );
}

export async function cacheRecipeDetail(
  db: SQLiteDatabase,
  recipe: RecipeDetail
) {
  const now = new Date().toISOString();

  await runWithSqliteRetry(() =>
    runWriteTransaction(db, async (transactionDb) => {
      await upsertRecipe(transactionDb, recipe, now);
      await replaceRecipeChildren(transactionDb, recipe);
    })
  );
}
