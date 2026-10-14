// Reads and writes of the saved recipes (the recipes table and its child
// tables). They run inside callers' transactions, and are shared by the app
// and its tests, so nothing here imports React Native.
import type { SQLiteDatabase } from "expo-sqlite";
import type {
  CreatorProfile,
  CreatorRecipeListParams,
  PaginatedResponse,
  RecipeDetail,
  RecipeListItem,
  RecipeSearchParams,
} from "../types/api.ts";

export type SeedRecipe = Omit<
  RecipeDetail,
  "isFavorited" | "createdAt" | "updatedAt"
> & {
  isFavorited?: boolean;
  createdAt?: string;
  updatedAt?: string;
  activePrepTimeMinutes?: number | null;
  passiveTimeMinutes?: number | null;
};

type RecipeRow = {
  raw_json: string;
};

export async function getLocalRecipes(
  db: SQLiteDatabase,
  params: RecipeSearchParams = {}
): Promise<PaginatedResponse<RecipeListItem>> {
  const rows = await db.getAllAsync<RecipeRow>(
    `
    SELECT raw_json
    FROM recipes
    WHERE review_status = 'published'
    ORDER BY name COLLATE NOCASE ASC
    `
  );

  const allRecipes = rows.map((row) => parseRecipeRow(row));
  const filtered = filterRecipes(allRecipes, params);
  const page = params.page ?? 1;
  const pageSize = params.pageSize ?? (filtered.length || 1);
  const start = (page - 1) * pageSize;

  return {
    items: filtered.slice(start, start + pageSize).map(toRecipeListItem),
    page,
    pageSize,
    total: filtered.length,
  };
}

export async function getLocalRecipeById(db: SQLiteDatabase, recipeId: string) {
  const row = await db.getFirstAsync<RecipeRow>(
    "SELECT raw_json FROM recipes WHERE id = ?",
    [recipeId]
  );

  return row ? parseRecipeRow(row) : null;
}

export async function upsertRecipe(
  db: SQLiteDatabase,
  recipe: RecipeDetail,
  updatedAt: string
) {
  await db.runAsync(
    `
    INSERT INTO recipes (
      id,
      name,
      slug,
      description,
      image_url,
      cuisine,
      source_url,
      source_name,
      source_site,
      review_status,
      difficulty,
      estimated_cost,
      calories_per_serving,
      base_servings,
      prep_time_minutes,
      cook_time_minutes,
      total_time_minutes,
      active_prep_time_minutes,
      passive_time_minutes,
      quality_score,
      quality_warnings_json,
      raw_json,
      updated_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      name = excluded.name,
      slug = excluded.slug,
      description = excluded.description,
      image_url = excluded.image_url,
      cuisine = excluded.cuisine,
      source_url = excluded.source_url,
      source_name = excluded.source_name,
      source_site = excluded.source_site,
      review_status = excluded.review_status,
      difficulty = excluded.difficulty,
      estimated_cost = excluded.estimated_cost,
      calories_per_serving = excluded.calories_per_serving,
      base_servings = excluded.base_servings,
      prep_time_minutes = excluded.prep_time_minutes,
      cook_time_minutes = excluded.cook_time_minutes,
      total_time_minutes = excluded.total_time_minutes,
      active_prep_time_minutes = excluded.active_prep_time_minutes,
      passive_time_minutes = excluded.passive_time_minutes,
      quality_score = excluded.quality_score,
      quality_warnings_json = excluded.quality_warnings_json,
      raw_json = excluded.raw_json,
      updated_at = excluded.updated_at
    `,
    [
      recipe.id,
      recipe.name,
      recipe.slug,
      recipe.description,
      recipe.imageUrl,
      recipe.cuisine,
      recipe.sourceUrl,
      recipe.sourceName,
      recipe.sourceSite,
      recipe.reviewStatus,
      recipe.difficulty,
      recipe.estimatedCost,
      recipe.caloriesPerServing,
      recipe.baseServings,
      recipe.prepTimeMinutes,
      recipe.cookTimeMinutes,
      recipe.totalTimeMinutes,
      getSeedExtraNumber(recipe, "activePrepTimeMinutes"),
      getSeedExtraNumber(recipe, "passiveTimeMinutes"),
      recipe.qualityScore,
      JSON.stringify(recipe.qualityWarnings),
      JSON.stringify(recipe),
      updatedAt,
    ]
  );
}

export async function replaceRecipeChildren(db: SQLiteDatabase, recipe: RecipeDetail) {
  await db.runAsync("DELETE FROM recipe_ingredients WHERE recipe_id = ?", [
    recipe.id,
  ]);
  await db.runAsync("DELETE FROM recipe_instructions WHERE recipe_id = ?", [
    recipe.id,
  ]);
  await db.runAsync("DELETE FROM recipe_notes WHERE recipe_id = ?", [recipe.id]);
  await db.runAsync("DELETE FROM recipe_tags WHERE recipe_id = ?", [recipe.id]);
  await db.runAsync("DELETE FROM recipe_dietary_tags WHERE recipe_id = ?", [
    recipe.id,
  ]);
  await db.runAsync("DELETE FROM recipe_allergens WHERE recipe_id = ?", [
    recipe.id,
  ]);

  for (const ingredient of recipe.ingredients) {
    await db.runAsync(
      `
      INSERT OR REPLACE INTO recipe_ingredients (
        id,
        recipe_id,
        position,
        raw_text,
        ingredient_name,
        canonical_ingredient_name,
        quantity,
        unit,
        display_text,
        category,
        available_units_json,
        is_core_ingredient,
        is_optional
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        ingredient.id,
        recipe.id,
        ingredient.position,
        ingredient.rawText,
        ingredient.ingredientName,
        ingredient.canonicalIngredientName,
        ingredient.quantity === null ? null : String(ingredient.quantity),
        ingredient.unit,
        ingredient.displayText,
        ingredient.category,
        JSON.stringify(ingredient.availableUnits),
        ingredient.isCoreIngredient ? 1 : 0,
        ingredient.isOptional ? 1 : 0,
      ]
    );
  }

  for (const instruction of recipe.instructions) {
    await db.runAsync(
      `
      INSERT OR REPLACE INTO recipe_instructions (
        id,
        recipe_id,
        step_number,
        text,
        type,
        segments_json
      )
      VALUES (?, ?, ?, ?, ?, ?)
      `,
      [
        instruction.id,
        recipe.id,
        instruction.stepNumber,
        instruction.text,
        instruction.type,
        JSON.stringify(instruction.segments ?? []),
      ]
    );
  }

  for (const [index, note] of recipe.notes.entries()) {
    await db.runAsync(
      `
      INSERT OR REPLACE INTO recipe_notes (id, recipe_id, position, text, type)
      VALUES (?, ?, ?, ?, ?)
      `,
      [note.id, recipe.id, index + 1, note.text, note.type]
    );
  }

  for (const tag of recipe.tags) {
    await db.runAsync("INSERT OR IGNORE INTO recipe_tags VALUES (?, ?)", [
      recipe.id,
      tag,
    ]);
  }

  for (const tag of recipe.dietaryTags) {
    await db.runAsync("INSERT OR IGNORE INTO recipe_dietary_tags VALUES (?, ?)", [
      recipe.id,
      tag,
    ]);
  }

  for (const allergen of recipe.allergens) {
    await db.runAsync("INSERT OR IGNORE INTO recipe_allergens VALUES (?, ?)", [
      recipe.id,
      allergen,
    ]);
  }
}

function filterRecipes(recipes: RecipeDetail[], params: RecipeSearchParams) {
  const normalizedSearch = params.search?.trim().toLowerCase();
  const normalizedTag = params.tag?.trim().toLowerCase();
  const normalizedCuisine = params.cuisine?.trim().toLowerCase();

  return recipes.filter((recipe) => {
    const tags = [...recipe.tags, ...recipe.dietaryTags].map((tag) =>
      tag.toLowerCase()
    );
    const ingredientNames = recipe.ingredients.map((ingredient) =>
      [
        ingredient.rawText,
        ingredient.ingredientName,
        ingredient.canonicalIngredientName,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
    );

    if (normalizedSearch) {
      const searchable = [
        recipe.name,
        recipe.description,
        recipe.cuisine,
        ...tags,
        ...ingredientNames,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      if (!searchable.includes(normalizedSearch)) {
        return false;
      }
    }

    if (normalizedTag && normalizedTag !== "all") {
      const compactTag = normalizedTag.replace(/[\s_-]+/g, "");
      const matchesTag = tags.some(
        (tag) =>
          tag === normalizedTag ||
          tag.replace(/[\s_-]+/g, "") === compactTag
      );

      if (!matchesTag) {
        return false;
      }
    }

    if (
      params.dietaryTag &&
      !recipe.dietaryTags
        .map((tag) => tag.toLowerCase())
        .includes(params.dietaryTag.toLowerCase())
    ) {
      return false;
    }

    if (
      params.allergenExclude?.some((allergen) =>
        recipe.allergens
          .map((item) => item.toLowerCase())
          .includes(allergen.toLowerCase())
      )
    ) {
      return false;
    }

    if (
      normalizedCuisine &&
      !recipe.cuisine?.toLowerCase().includes(normalizedCuisine)
    ) {
      return false;
    }

    if (
      params.maxCost !== undefined &&
      recipe.estimatedCost !== null &&
      recipe.estimatedCost > params.maxCost
    ) {
      return false;
    }

    if (params.difficulty && recipe.difficulty !== params.difficulty) {
      return false;
    }

    if (
      params.quickAndEasy &&
      (recipe.totalTimeMinutes === null || recipe.totalTimeMinutes > 45)
    ) {
      return false;
    }

    if (
      params.maxTotalTimeMinutes !== undefined &&
      (recipe.totalTimeMinutes === null ||
        recipe.totalTimeMinutes > params.maxTotalTimeMinutes)
    ) {
      return false;
    }

    return true;
  });
}

function toRecipeListItem(recipe: RecipeDetail): RecipeListItem {
  return {
    id: recipe.id,
    name: recipe.name,
    slug: recipe.slug,
    imageUrl: recipe.imageUrl,
    cuisine: recipe.cuisine,
    tags: recipe.tags,
    dietaryTags: recipe.dietaryTags,
    categories: recipe.classifications
      .filter((item) => item.kind === "category")
      .map((item) => item.value),
    estimatedCost: recipe.estimatedCost,
    baseServings: recipe.baseServings,
    caloriesPerServing: recipe.caloriesPerServing,
    totalTimeMinutes: recipe.totalTimeMinutes,
    difficulty: recipe.difficulty,
    reviewStatus: recipe.reviewStatus,
    creator: recipe.creator,
    averageRating: recipe.averageRating,
    ratingCount: recipe.ratingCount,
    isFavorited: recipe.isFavorited,
  };
}

function parseRecipeRow(row: RecipeRow): RecipeDetail {
  return mapSeedRecipe(JSON.parse(row.raw_json), new Date().toISOString());
}

function mapSeedRecipe(seedRecipe: SeedRecipe, fallbackDate: string): RecipeDetail {
  return {
    ...seedRecipe,
    isFavorited: seedRecipe.isFavorited ?? false,
    createdAt: seedRecipe.createdAt ?? fallbackDate,
    updatedAt: seedRecipe.updatedAt ?? fallbackDate,
    instructions: seedRecipe.instructions.map((instruction) => ({
      id:
        "id" in instruction && typeof instruction.id === "string"
          ? instruction.id
          : `${seedRecipe.id}-instruction-${instruction.stepNumber}`,
      stepNumber: instruction.stepNumber,
      stepName:
        "stepName" in instruction && typeof instruction.stepName === "string"
          ? instruction.stepName
          : null,
      text: instruction.text,
      commonMistake:
        "commonMistake" in instruction &&
        typeof instruction.commonMistake === "string"
          ? instruction.commonMistake
          : null,
      helpfulTip:
        "helpfulTip" in instruction && typeof instruction.helpfulTip === "string"
          ? instruction.helpfulTip
          : null,
      type:
        "type" in instruction && typeof instruction.type === "string"
          ? instruction.type
          : "instruction",
      segments:
        "segments" in instruction && Array.isArray(instruction.segments)
          ? instruction.segments
          : [],
      timers:
        "timers" in instruction && Array.isArray(instruction.timers)
          ? instruction.timers
          : [],
    })),
    notes: seedRecipe.notes.map((note, index) => ({
      id:
        "id" in note && typeof note.id === "string"
          ? note.id
          : `${seedRecipe.id}-note-${index + 1}`,
      text: note.text,
      type: note.type ?? null,
    })),
  };
}

function getSeedExtraNumber(recipe: RecipeDetail, key: string) {
  const value = (recipe as unknown as Record<string, unknown>)[key];
  return typeof value === "number" ? value : null;
}

// The recipe catalogue (OFF-01): every public recipe, as GET
// /recipes/catalogue returns it and as the app bundles it for a first start
// offline. `version` is the server's version of it (its ETag).
export type RecipeCatalogue = { version: string; items: SeedRecipe[] };

const CHILD_TABLES = [
  "recipe_ingredients",
  "recipe_instructions",
  "recipe_notes",
  "recipe_tags",
  "recipe_dietary_tags",
  "recipe_allergens",
];

export async function getLocalMetadata(db: SQLiteDatabase, key: string) {
  const row = await db.getFirstAsync<{ value: string }>(
    "SELECT value FROM local_metadata WHERE key = ?",
    [key]
  );
  return row?.value ?? null;
}

export async function setLocalMetadata(db: SQLiteDatabase, key: string, value: string, now: string) {
  await db.runAsync(
    `
    INSERT INTO local_metadata (key, value, updated_at)
    VALUES (?, ?, ?)
    ON CONFLICT(key) DO UPDATE SET
      value = excluded.value,
      updated_at = excluded.updated_at
    `,
    [key, value, now]
  );
}

export const RECIPE_CATALOGUE_VERSION_KEY = "recipe_catalogue_version";

// Makes the saved recipes exactly this catalogue. Only the recipes tables
// change: they hold the catalogue and copies of recipes opened online, never
// the person's own data (their drafts, favourites and lists live elsewhere).
export async function replaceRecipeCatalogue(tx: SQLiteDatabase, catalogue: RecipeCatalogue, now: string) {
  const ids = JSON.stringify(catalogue.items.map((recipe) => recipe.id));
  for (const table of CHILD_TABLES) {
    await tx.runAsync(`DELETE FROM ${table} WHERE recipe_id NOT IN (SELECT value FROM json_each(?))`, [ids]);
  }
  await tx.runAsync("DELETE FROM recipes WHERE id NOT IN (SELECT value FROM json_each(?))", [ids]);

  for (const item of catalogue.items) {
    const recipe = mapSeedRecipe(item, now);
    await upsertRecipe(tx, recipe, now);
    await replaceRecipeChildren(tx, recipe);
  }
  await setLocalMetadata(tx, RECIPE_CATALOGUE_VERSION_KEY, catalogue.version, now);
}

// The photos the saved recipes show: each recipe's photo and its creator's
// avatar.
export async function getCataloguePhotoUrls(db: SQLiteDatabase) {
  const rows = await db.getAllAsync<{ image_url: string | null; avatar_url: string | null }>(
    "SELECT image_url, json_extract(raw_json, '$.creator.avatarUrl') AS avatar_url FROM recipes"
  );
  return rows
    .flatMap((row) => [row.image_url, row.avatar_url])
    .filter((url): url is string => typeof url === "string" && /^https:\/\//i.test(url));
}

async function getSavedRecipesBy(db: SQLiteDatabase, handle: string) {
  const rows = await db.getAllAsync<RecipeRow>(
    `
    SELECT raw_json
    FROM recipes
    WHERE review_status = 'published' AND json_extract(raw_json, '$.creator.handle') = ?
    `,
    [handle]
  );
  return rows.map(parseRecipeRow);
}

// A creator's recipes kept on the phone, for their page offline (OFF-01).
export async function getLocalCreatorRecipes(
  db: SQLiteDatabase,
  handle: string,
  params: CreatorRecipeListParams = {}
): Promise<PaginatedResponse<RecipeListItem>> {
  const recipes = filterRecipes(await getSavedRecipesBy(db, handle), { search: params.search });
  const sorted =
    params.sort === "top_rated"
      ? recipes.sort((a, b) => (b.averageRating ?? 0) - (a.averageRating ?? 0))
      : recipes.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const page = params.page ?? 1;
  const pageSize = params.pageSize ?? (sorted.length || 1);
  const start = (page - 1) * pageSize;
  return {
    items: sorted.slice(start, start + pageSize).map(toRecipeListItem),
    page,
    pageSize,
    total: sorted.length,
  };
}

// What the saved recipes say about their creator: name, photo and how many
// recipes. The rest of the profile (bio, cover) needs a connection.
export async function getLocalCreatorProfile(db: SQLiteDatabase, handle: string): Promise<CreatorProfile | null> {
  const recipes = await getSavedRecipesBy(db, handle);
  const creator = recipes[0]?.creator;
  if (!creator) return null;
  return {
    id: creator.id,
    displayName: creator.displayName,
    handle: creator.handle,
    bio: null,
    avatarUrl: creator.avatarUrl ?? null,
    coverUrl: null,
    specialities: [],
    isOwner: false,
    isSaved: false,
    publishedRecipeCount: recipes.length,
    totalRecipeSaves: 0,
    averageRating: null,
    createdAt: recipes[0].createdAt,
    updatedAt: recipes[0].updatedAt,
  };
}
