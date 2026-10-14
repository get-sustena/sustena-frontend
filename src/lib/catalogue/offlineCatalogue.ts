import type { QueryClient } from "@tanstack/react-query";
import type { SQLiteDatabase } from "expo-sqlite";
import { getCataloguePhotoUrls } from "../../db/recipeRows";
import { runWriteTransaction } from "../../db/writeTransaction";
import { recipesApi } from "../api";
import { syncPhotos } from "./photoCache";
import { photoStore } from "./photoFiles";
import { syncRecipeCatalogue } from "./recipeCatalogueSync";
import { loadSavedPhotos } from "./recipePhotoSource";

// As the app opens: screens show the photos already saved on the phone.
export async function showSavedPhotos(db: SQLiteDatabase) {
  await loadSavedPhotos(db).catch((error) => {
    console.error("Failed to read the saved photos", error);
  });
}

// After /me/start: brings the recipes kept on the phone up to date when the
// catalogue changed, then saves any photo not saved yet, on any connection
// (OFF-01). What fails is tried again on the next start.
export async function keepRecipesOffline(
  db: SQLiteDatabase,
  queryClient: QueryClient,
  latestVersion: string | null
) {
  try {
    const { downloaded } = await syncRecipeCatalogue(
      {
        db,
        transact: (work) => runWriteTransaction(db, work),
        now: () => new Date().toISOString(),
        fetchCatalogue: recipesApi.getRecipeCatalogue,
      },
      latestVersion
    );
    if (downloaded) {
      await queryClient.invalidateQueries({
        predicate: (query) => query.queryKey[0] === "recipes",
      });
    }
  } catch (error) {
    console.error("Failed to update the recipes kept offline", error);
  }

  try {
    const urls = await getCataloguePhotoUrls(db);
    await syncPhotos({ db, store: photoStore, now: () => new Date().toISOString() }, urls);
    await loadSavedPhotos(db);
  } catch (error) {
    console.error("Failed to save recipe photos", error);
  }
}
