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

// Cache the static catalogue locally so picker searches do not hit the API per keystroke.
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
