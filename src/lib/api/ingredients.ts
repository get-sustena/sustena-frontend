import { Ingredient, IngredientSearchParams } from "../../types/api";
import { apiRequest } from "./client";
import { fetchAllPages } from "./fetchAllPages";

function getIngredients(params?: IngredientSearchParams) {
  return apiRequest<Ingredient[]>({
    url: "/ingredients",
    method: "GET",
    params,
  });
}

// Cache the static catalogue locally so picker searches do not hit the API per keystroke.
export function getAllIngredients(): Promise<Ingredient[]> {
  return fetchAllPages((limit, offset) => getIngredients({ limit, offset }));
}
