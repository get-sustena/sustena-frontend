import { IngredientSearchParams, RecipeSearchParams } from "../../types/api";

export const queryKeys = {
  auth: {
    me: ["auth", "me"] as const,
  },
  units: {
    all: ["units"] as const,
  },
  ingredients: {
    list: (params?: IngredientSearchParams) =>
      ["ingredients", "list", params ?? {}] as const,
    categories: ["ingredients", "categories"] as const,
    catalog: ["ingredients", "catalog"] as const,
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
    detail: (id: string) => ["recipes", "detail", id] as const,
    slug: (slug: string) => ["recipes", "slug", slug] as const,
    tags: ["recipes", "tags"] as const,
  },
  favorites: {
    all: ["favorites"] as const,
  },
  shoppingList: {
    active: ["shopping-list", "active"] as const,
  },
  shoppingLists: {
    all: ["shopping-lists"] as const,
  },
  planner: {
    settings: ["planner", "settings"] as const,
    budget: (payload: unknown) => ["planner", "budget", payload] as const,
    kitchen: (payload: unknown) => ["planner", "kitchen", payload] as const,
    timetable: (payload: unknown) =>
      ["planner", "timetable", payload] as const,
  },
};
