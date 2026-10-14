import assert from "node:assert/strict";
import { test } from "node:test";
import { getLocalRecipeById, getLocalRecipes } from "../src/db/recipeRows.ts";
import { applyBundledSeedIfNew, syncRecipeCatalogue } from "../src/lib/catalogue/recipeCatalogueSync.ts";
import { openTestDatabase, testDatabasePath } from "./helpers/sqlite.mjs";

const recipe = (id, name, extra = {}) => ({
  id,
  name,
  slug: id,
  description: null,
  imageUrl: `https://res.cloudinary.com/demo/${id}.webp`,
  cuisine: "Nigerian",
  sourceUrl: null,
  sourceName: null,
  sourceSite: null,
  reviewStatus: "published",
  difficulty: "easy",
  estimatedCost: 1000,
  caloriesPerServing: 400,
  baseServings: 2,
  prepTimeMinutes: 10,
  cookTimeMinutes: 20,
  totalTimeMinutes: 30,
  qualityScore: null,
  qualityWarnings: [],
  tags: [],
  dietaryTags: [],
  allergens: [],
  classifications: [],
  ingredients: [
    {
      id: `${id}-ing-1`,
      position: 1,
      rawText: "2 cups rice",
      ingredientName: "rice",
      canonicalIngredientName: "rice",
      quantity: 2,
      unit: "cup",
      displayText: "2 cups rice",
      category: "Grains",
      availableUnits: [],
      isCoreIngredient: true,
      isOptional: false,
    },
  ],
  instructions: [{ id: `${id}-step-1`, stepNumber: 1, text: "Boil the rice.", type: "instruction", segments: [], timers: [] }],
  notes: [],
  creator: null,
  averageRating: null,
  ratingCount: 0,
  ...extra,
});

// The seed shipped with the app before OFF-01: old ids that the server no
// longer knows.
const OLD_SEED = { version: "2026-06-19-published-112", items: [recipe("06d226e3dc545875", "Old jollof")] };
const SEED = { version: "v1", items: [recipe("sustena_pap-ogi", "Pap"), recipe("sustena_jollof-rice", "Jollof Rice")] };
const LATEST = {
  version: "v2",
  items: [recipe("sustena_pap-ogi", "Pap (Ogi)"), recipe("sustena_jollof-rice", "Jollof Rice"), recipe("sustena_egusi", "Egusi Soup")],
};

const deps = (database, fetchCatalogue = async () => assert.fail("no download expected")) => ({
  db: database.db,
  transact: database.transact,
  now: () => "2026-10-14T12:00:00.000Z",
  fetchCatalogue,
});

const savedIds = async (db) => (await db.getAllAsync("SELECT id FROM recipes ORDER BY id")).map((row) => row.id);

test("OFF-01: a fresh install with no network shows the bundled recipes and opens any of them", async () => {
  const database = await openTestDatabase();
  assert.equal(await applyBundledSeedIfNew(deps(database), SEED), true);

  const list = await getLocalRecipes(database.db);
  assert.deepEqual(list.items.map((item) => item.id).sort(), ["sustena_jollof-rice", "sustena_pap-ogi"]);
  for (const { id } of SEED.items) {
    const opened = await getLocalRecipeById(database.db, id);
    assert.equal(opened?.id, id);
    assert.equal(opened?.instructions[0].text, "Boil the rice.");
  }
});

test("OFF-01: the new seed replaces recipes saved under the old ids", async () => {
  const database = await openTestDatabase();
  await applyBundledSeedIfNew(deps(database), OLD_SEED);
  await applyBundledSeedIfNew(deps(database), SEED);

  assert.deepEqual(await savedIds(database.db), ["sustena_jollof-rice", "sustena_pap-ogi"]);
  const children = await database.db.getAllAsync("SELECT DISTINCT recipe_id FROM recipe_ingredients ORDER BY recipe_id");
  assert.deepEqual(children.map((row) => row.recipe_id), ["sustena_jollof-rice", "sustena_pap-ogi"]);
});

test("OFF-01: the same seed isn't applied twice, so it can't undo a newer download", async () => {
  const path = testDatabasePath();
  const first = await openTestDatabase(path);
  await applyBundledSeedIfNew(deps(first), SEED);
  await syncRecipeCatalogue(deps(first, async () => ({ changed: true, catalogue: LATEST })), "v2");
  first.db.close();

  const restarted = await openTestDatabase(path);
  assert.equal(await applyBundledSeedIfNew(deps(restarted), SEED), false);
  assert.equal((await getLocalRecipeById(restarted.db, "sustena_pap-ogi"))?.name, "Pap (Ogi)");
});

test("OFF-01: an unchanged catalogue version downloads nothing", async () => {
  const database = await openTestDatabase();
  await applyBundledSeedIfNew(deps(database), SEED);

  const result = await syncRecipeCatalogue(deps(database), "v1");
  assert.deepEqual(result, { downloaded: false });
});

test("OFF-01: a changed version downloads the catalogue once and replaces the saved recipes", async () => {
  const database = await openTestDatabase();
  await applyBundledSeedIfNew(deps(database), SEED);
  const requests = [];
  const fetchCatalogue = async (savedVersion) => {
    requests.push(savedVersion);
    return { changed: true, catalogue: LATEST };
  };

  assert.deepEqual(await syncRecipeCatalogue(deps(database, fetchCatalogue), "v2"), { downloaded: true });
  assert.deepEqual(requests, ["v1"]);
  assert.deepEqual(await savedIds(database.db), ["sustena_egusi", "sustena_jollof-rice", "sustena_pap-ogi"]);

  // The next start reports the same version: nothing more to download.
  assert.deepEqual(await syncRecipeCatalogue(deps(database, fetchCatalogue), "v2"), { downloaded: false });
  assert.equal(requests.length, 1);
});

test("OFF-01: when the server says the saved catalogue is current, nothing changes", async () => {
  const database = await openTestDatabase();
  await applyBundledSeedIfNew(deps(database), SEED);

  const result = await syncRecipeCatalogue(deps(database, async () => ({ changed: false })), null);
  assert.deepEqual(result, { downloaded: false });
  assert.deepEqual(await savedIds(database.db), ["sustena_jollof-rice", "sustena_pap-ogi"]);
});

test("OFF-01: a failed download keeps the saved catalogue", async () => {
  const database = await openTestDatabase();
  await applyBundledSeedIfNew(deps(database), SEED);
  const failing = async () => {
    throw Object.assign(new Error("Network Error"), { status: 0 });
  };

  await assert.rejects(syncRecipeCatalogue(deps(database, failing), "v2"));
  assert.deepEqual(await savedIds(database.db), ["sustena_jollof-rice", "sustena_pap-ogi"]);
  assert.deepEqual(await syncRecipeCatalogue(deps(database), "v1"), { downloaded: false });
});

test("OFF-01: replacing the catalogue leaves the person's own data alone", async () => {
  const database = await openTestDatabase();
  await applyBundledSeedIfNew(deps(database), SEED);
  await database.db.runAsync(
    "INSERT INTO favorite_recipes (recipe_id, created_at, updated_at) VALUES ('sustena_pap-ogi', 'now', 'now')"
  );
  await database.db.runAsync(
    "INSERT INTO creator_recipe_drafts (id, payload_json, sync_status, updated_at) VALUES ('draft-1', '{\"name\":\"My stew\"}', 'local', 'now')"
  );

  await syncRecipeCatalogue(deps(database, async () => ({ changed: true, catalogue: LATEST })), "v2");

  assert.deepEqual(
    (await database.db.getAllAsync("SELECT recipe_id FROM favorite_recipes")).map((row) => row.recipe_id),
    ["sustena_pap-ogi"]
  );
  assert.deepEqual(await database.db.getAllAsync("SELECT id, payload_json FROM creator_recipe_drafts"), [
    { id: "draft-1", payload_json: '{"name":"My stew"}' },
  ]);
});

const KITCHEN = { id: "creator-1", handle: "sustenakitchen", displayName: "Sustena Kitchen", avatarUrl: null };
const AMAKA = { id: "creator-2", handle: "amaka", displayName: "Amaka", avatarUrl: "https://media.getsustena.com/a.jpg" };
const BY_CREATOR = {
  version: "v3",
  items: [
    recipe("pap", "Pap", { creator: KITCHEN, createdAt: "2026-01-01T00:00:00Z", averageRating: 4.9 }),
    recipe("egusi", "Egusi Soup", { creator: KITCHEN, createdAt: "2026-03-01T00:00:00Z", averageRating: 4.8 }),
    recipe("ofada", "Ofada Stew", { creator: AMAKA, createdAt: "2026-02-01T00:00:00Z" }),
  ],
};

test("OFF-01: offline, a creator's page lists their recipes kept on the phone", async () => {
  const { getLocalCreatorRecipes } = await import("../src/db/recipeRows.ts");
  const database = await openTestDatabase();
  await applyBundledSeedIfNew(deps(database), BY_CREATOR);

  const newest = await getLocalCreatorRecipes(database.db, "sustenakitchen", { sort: "newest" });
  assert.deepEqual(newest.items.map((item) => item.id), ["egusi", "pap"]);
  assert.equal(newest.total, 2);
  const topRated = await getLocalCreatorRecipes(database.db, "sustenakitchen", { sort: "top_rated" });
  assert.deepEqual(topRated.items.map((item) => item.id), ["pap", "egusi"]);
  const searched = await getLocalCreatorRecipes(database.db, "sustenakitchen", { search: "pap" });
  assert.deepEqual(searched.items.map((item) => item.id), ["pap"]);
});

test("OFF-01: offline, a creator's page shows their name, photo and recipe count from the saved recipes", async () => {
  const { getLocalCreatorProfile } = await import("../src/db/recipeRows.ts");
  const database = await openTestDatabase();
  await applyBundledSeedIfNew(deps(database), BY_CREATOR);

  const profile = await getLocalCreatorProfile(database.db, "amaka");
  assert.equal(profile?.displayName, "Amaka");
  assert.equal(profile?.avatarUrl, AMAKA.avatarUrl);
  assert.equal(profile?.publishedRecipeCount, 1);
  assert.equal(profile?.bio, null);
  assert.equal(await getLocalCreatorProfile(database.db, "nobody"), null);
});
