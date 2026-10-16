import {
  CreatorRecipeListParams,
  MyRecipeListParams,
  RecipeSearchParams,
} from "../../types/api";
import type { MealTime } from "../mealTime";

export const queryKeys = {
  auth: {
    me: ["auth", "me"] as const,
  },
  // What this phone remembers about the Home reminders, per person.
  reminders: {
    email: (userId: string) => ["reminders", "email", userId] as const,
    profile: (userId: string) => ["reminders", "profile", userId] as const,
  },
  start: ["me", "start"] as const,
  units: {
    all: ["units"] as const,
  },
  ingredients: {
    catalog: ["ingredients", "catalog"] as const,
    savedCatalog: ["ingredients", "saved-catalog"] as const,
  },
  pantry: {
    me: ["pantry", "me"] as const,
  },
  preferences: {
    me: ["preferences", "me"] as const,
    ingredientCalories: ["preferences", "ingredient-calories"] as const,
  },
  profileAnswers: {
    me: ["profile-answers", "me"] as const,
  },
  recipes: {
    all: ["recipes"] as const,
    list: (params?: RecipeSearchParams) =>
      ["recipes", "list", params ?? {}] as const,
    infiniteList: (params?: Omit<RecipeSearchParams, "page">) =>
      ["recipes", "infinite-list", params ?? {}] as const,
    localFallback: (params?: RecipeSearchParams) =>
      ["recipes", "local-fallback", params ?? {}] as const,
    localFallbackDetail: (id: string) =>
      ["recipes", "local-fallback-detail", id] as const,
    localFavorites: ["recipes", "local-profile-favorites"] as const,
    detail: (id: string) => ["recipes", "detail", id] as const,
    publicCard: (slug: string) => ["recipes", "public-card", slug] as const,
    // Ratings waiting in the outbox (local only).
    pendingRatings: ["recipes", "pending-ratings"] as const,
    // The Lagos day this person last marked the recipe cooked (local only).
    cookedDay: (userId: string, recipeId: string) =>
      ["recipes", "cooked-day", userId, recipeId] as const,
  },
  recommendations: {
    // Pantry, preference and profile changes invalidate this prefix, which
    // also covers every meal's key below.
    home: ["recommendations", "home"] as const,
    homeForMeal: (mealTime: MealTime) =>
      ["recommendations", "home", mealTime] as const,
    localFallback: (mealTime: MealTime) =>
      ["recommendations", "local-fallback", mealTime] as const,
  },
  creators: {
    all: ["creators"] as const,
    me: ["creators", "me"] as const,
    handle: (handle: string) => ["creators", "handle", handle] as const,
    handleAvailability: (handle: string) =>
      ["creators", "handle-availability", handle] as const,
    recipes: (handle: string, params?: CreatorRecipeListParams) =>
      ["creators", "recipes", handle, params ?? {}] as const,
    saved: ["creators", "saved"] as const,
    // Follows and unfollows waiting in the outbox (local only).
    pendingFollows: ["creators", "pending-follows"] as const,
    publicCard: (handle: string) => ["creators", "public-card", handle] as const,
  },
  creatorRecipes: {
    all: ["creator-recipes"] as const,
    list: (params?: MyRecipeListParams) =>
      ["creator-recipes", "list", params ?? {}] as const,
    detail: (id: string) => ["creator-recipes", "detail", id] as const,
    vocabulary: ["creator-recipes", "vocabulary"] as const,
  },
  favorites: {
    all: ["favorites"] as const,
  },
  shoppingLists: {
    all: ["shopping-lists"] as const,
  },
  planner: {
    settings: ["planner", "settings"] as const,
  },
  // Edits the server refused, kept on the phone (F02).
  unsavedChanges: ["outbox", "unsaved-changes"] as const,
};
