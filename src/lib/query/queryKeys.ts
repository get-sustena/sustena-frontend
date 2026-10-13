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
  units: {
    all: ["units"] as const,
  },
  ingredients: {
    catalog: ["ingredients", "catalog"] as const,
  },
  pantry: {
    me: ["pantry", "me"] as const,
  },
  preferences: {
    me: ["preferences", "me"] as const,
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
};
