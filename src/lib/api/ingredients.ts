import { Ingredient, IngredientSearchParams } from "../../types/api";
import { apiRequest } from "./client";

export function getIngredients(params?: IngredientSearchParams) {
  return apiRequest<Ingredient[]>({
    url: "/ingredients",
    method: "GET",
    params,
  });
}

export function getIngredientCategories() {
  return apiRequest<string[]>({
    url: "/ingredients/categories",
    method: "GET",
  });
}

// GET /ingredients caps `limit` at 500 server-side, but the full catalog (~500+ rows) is small,
// static reference data that's cheap to fetch in full and cache client-side once, rather than
// re-querying the backend on every keystroke of a kitchen-picker search.
const CATALOG_PAGE_SIZE = 500;

export async function getAllIngredients(): Promise<Ingredient[]> {
  const all: Ingredient[] = [];
  let offset = 0;

  while (true) {
    const page = await getIngredients({ limit: CATALOG_PAGE_SIZE, offset });
    all.push(...page);

    if (page.length < CATALOG_PAGE_SIZE) {
      break;
    }

    offset += CATALOG_PAGE_SIZE;
  }

  return all;
}
