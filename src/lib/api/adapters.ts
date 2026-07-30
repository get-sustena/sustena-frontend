import { Recipe, RecipeTag } from "../../data/recipes";
import {
  FavoriteRecipe,
  RecipeDetail,
  RecipeIngredient,
  RecipeListItem,
  ShoppingListItem as ApiShoppingListItem,
} from "../../types/api";
import { ShoppingListItem } from "../../types/shoppingList";
import { capitalizeWords } from "../textFormatters";
import { API_BASE_URL } from "./config";
import { isSelectableIngredientUnit } from "../unitConversion";

export function apiRecipeToLocalRecipe(
  recipe: RecipeListItem | RecipeDetail
): Recipe {
  const totalTimeMinutes = recipe.totalTimeMinutes;
  const ingredients =
    "ingredients" in recipe
      ? recipe.ingredients.map(apiIngredientToLocalIngredient)
      : [];

  return {
    id: recipe.id,
    name: recipe.name,
    emoji: "🍲",
    imageUrl: normalizeImageUrl(recipe.imageUrl),
    time: totalTimeMinutes ? `${totalTimeMinutes} MIN` : "Time varies",
    calories: recipe.caloriesPerServing,
    cost: recipe.estimatedCost,
    prepTimeMinutes: "prepTimeMinutes" in recipe ? recipe.prepTimeMinutes : null,
    cookTimeMinutes: "cookTimeMinutes" in recipe ? recipe.cookTimeMinutes : null,
    totalTimeMinutes,
    activePrepTimeMinutes:
      "activePrepTimeMinutes" in recipe
        ? getOptionalNumber(recipe, "activePrepTimeMinutes")
        : null,
    passiveTimeMinutes:
      "passiveTimeMinutes" in recipe
        ? getOptionalNumber(recipe, "passiveTimeMinutes")
        : null,
    baseServings:
      "baseServings" in recipe && recipe.baseServings ? recipe.baseServings : 1,
    difficulty: toLocalDifficulty(recipe.difficulty),
    tags: toLocalTags(recipe.tags),
    filters: getRecipeFilters(recipe),
    ingredients,
    steps:
      "instructions" in recipe
        ? [...recipe.instructions]
            .sort((a, b) => a.stepNumber - b.stepNumber)
            .map((instruction) => instruction.text)
        : [],
    notes: "notes" in recipe ? recipe.notes.map((note) => note.text) : [],
    tools: [],
  };
}

export function apiFavoriteToRecipe(favorite: FavoriteRecipe) {
  return favorite.recipe ? apiRecipeToLocalRecipe(favorite.recipe) : null;
}

export function apiShoppingItemToLocalItem(
  item: ApiShoppingListItem
): ShoppingListItem {
  return {
    id: item.id,
    name: item.name,
    emoji: item.emoji ?? "🛒",
    quantity: item.quantity ?? item.unit ?? "",
    unit: item.unit ?? undefined,
    category: item.category ?? "Pantry",
    estimatedPrice: item.estimatedPrice ?? 0,
    checked: item.checked,
    sourceRecipeId: item.recipeId ?? undefined,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  };
}

function apiIngredientToLocalIngredient(ingredient: RecipeIngredient) {
  const amountLabel =
    ingredient.displayText ??
    ingredient.availableUnits[0]?.label ??
    ingredient.rawText;
  const amount = {
    metric: amountLabel,
    cups:
      findNigerianUnitLabel(ingredient) ??
      amountLabel,
    imperial:
      findUnitLabel(ingredient, "ounce") ??
      findUnitLabel(ingredient, "pound") ??
      amountLabel,
  };

  return {
    id: ingredient.id,
    name:
      ingredient.ingredientName ??
      ingredient.canonicalIngredientName ??
      ingredient.rawText,
    canonicalIngredientName: ingredient.canonicalIngredientName,
    rawText: ingredient.rawText,
    emoji: "🛒",
    amount,
    availableUnits: ingredient.availableUnits,
    displayText: ingredient.displayText,
    quantity: ingredient.quantity,
    unit: ingredient.unit,
    category: ingredient.category ?? "Pantry",
  };
}

function findUnitLabel(ingredient: RecipeIngredient, unitNeedle: string) {
  return ingredient.availableUnits.find((unit) =>
    unit.unit?.toLowerCase().includes(unitNeedle)
  )?.label;
}

function findNigerianUnitLabel(ingredient: RecipeIngredient) {
  const nigerianUnitIds = ["milk_cup", "derica", "congo"];

  return nigerianUnitIds
    .map(
      (unitId) =>
        ingredient.availableUnits.find(
          (unit) =>
            isSelectableIngredientUnit(unit.unit) &&
            unit.unit?.toLowerCase().includes(unitId)
        )?.label
    )
    .find(Boolean);
}

function getRecipeFilters(recipe: RecipeListItem | RecipeDetail) {
  const filters = new Set<string>();
  const tags = [...recipe.tags, ...recipe.dietaryTags].map((tag) =>
    tag.toLowerCase()
  );

  if (recipe.cuisine?.toLowerCase().includes("nigeria")) {
    filters.add("nigerian");
  }

  if (recipe.estimatedCost !== null && recipe.estimatedCost <= 3000) {
    filters.add("budget");
  }

  if (recipe.totalTimeMinutes !== null && recipe.totalTimeMinutes <= 45) {
    filters.add("quick");
  }

  for (const tag of tags) {
    filters.add(tag.replace(/[\s_-]+/g, ""));
  }

  return Array.from(filters);
}

function toLocalDifficulty(difficulty: RecipeListItem["difficulty"]) {
  if (difficulty === "medium") return "Medium";
  if (difficulty === "hard") return "Hard";

  return "Easy";
}

function toLocalTags(tags: string[]) {
  return tags.map((tag) => {
    const normalized = tag.toLowerCase().replace(/[\s_-]+/g, "");

    if (normalized === "nigerian") return "Nigerian";
    if (normalized === "budget") return "Budget";
    if (normalized === "vegan") return "Vegan";
    if (normalized === "highprotein") return "High Protein";
    if (normalized === "quick") return "Quick";
    if (normalized === "traditional") return "Traditional";
    if (normalized === "pescetarian") return "Pescetarian";
    if (normalized === "healthy") return "Healthy";
    if (normalized === "breakfast") return "Breakfast";

    return capitalizeWords(tag.replace(/_/g, " "));
  }) as RecipeTag[];
}

function normalizeImageUrl(imageUrl: string | null) {
  if (!imageUrl) {
    return null;
  }

  if (/^https?:\/\//i.test(imageUrl)) {
    return imageUrl;
  }

  try {
    return new URL(imageUrl, API_BASE_URL).toString();
  } catch {
    return imageUrl;
  }
}

function getOptionalNumber(value: unknown, key: string) {
  const record = value as Record<string, unknown>;
  return typeof record[key] === "number" ? record[key] : null;
}
