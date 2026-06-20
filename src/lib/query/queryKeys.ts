import { RecipeSearchParams } from "../../types/api";

export const queryKeys = {
  auth: {
    me: ["auth", "me"] as const,
  },
  preferences: {
    me: ["preferences", "me"] as const,
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
  planner: {
    budget: (payload: unknown) => ["planner", "budget", payload] as const,
    kitchen: (payload: unknown) => ["planner", "kitchen", payload] as const,
    timetable: (payload: unknown) =>
      ["planner", "timetable", payload] as const,
  },
};
