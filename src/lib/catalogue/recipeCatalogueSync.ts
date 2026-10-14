// Keeps every public recipe on the device, so recipes open with no
// connection (OFF-01). Shared by the app and its tests, so nothing here
// imports React Native.
import type { SQLiteDatabase } from "expo-sqlite";
import {
  getLocalMetadata,
  RECIPE_CATALOGUE_VERSION_KEY,
  replaceRecipeCatalogue,
  setLocalMetadata,
  type RecipeCatalogue,
} from "../../db/recipeRows.ts";

export type CatalogueDownload = { changed: false } | { changed: true; catalogue: RecipeCatalogue };

type Dependencies = {
  db: SQLiteDatabase;
  // Runs `work` in one SQLite transaction (the app's runWriteTransaction).
  transact: <T>(work: (db: SQLiteDatabase) => Promise<T>) => Promise<T>;
  now: () => string;
  // GET /recipes/catalogue, sending the saved version so an unchanged
  // catalogue answers 304.
  fetchCatalogue: (savedVersion: string | null) => Promise<CatalogueDownload>;
};

// Which bundled seed was applied last, so each one is applied once.
const APPLIED_SEED_KEY = "recipe_catalogue_seed";

// `latestVersion` is the version /me/start reports: when it matches the
// saved one, nothing is downloaded. Without it, the server decides (304).
export async function syncRecipeCatalogue(
  { db, transact, now, fetchCatalogue }: Dependencies,
  latestVersion: string | null
) {
  const savedVersion = await getLocalMetadata(db, RECIPE_CATALOGUE_VERSION_KEY);
  if (latestVersion && latestVersion === savedVersion) return { downloaded: false };

  const download = await fetchCatalogue(savedVersion);
  if (!download.changed) return { downloaded: false };

  await transact((tx) => replaceRecipeCatalogue(tx, download.catalogue, now()));
  return { downloaded: true };
}

// The catalogue bundled with this build, for a first start with no
// connection. A newer app's seed replaces what's saved once; a download made
// after that stays until the next build's seed.
export async function applyBundledSeedIfNew(
  { db, transact, now }: Omit<Dependencies, "fetchCatalogue">,
  seed: RecipeCatalogue | null
) {
  if (!seed) return false;
  if ((await getLocalMetadata(db, APPLIED_SEED_KEY)) === seed.version) return false;

  await transact(async (tx) => {
    const at = now();
    await replaceRecipeCatalogue(tx, seed, at);
    await setLocalMetadata(tx, APPLIED_SEED_KEY, seed.version, at);
  });
  return true;
}
