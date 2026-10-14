import { Platform } from "react-native";
import { Ingredient, IngredientSearchParams } from "../../types/api";
import { apiConditionalGet, apiRequest } from "./client";
import { isApiClientError } from "./errors";
import { fetchAllPages } from "./fetchAllPages";

function getIngredients(params?: IngredientSearchParams) {
  return apiRequest<Ingredient[]>({
    url: "/ingredients",
    method: "GET",
    params,
  });
}

type IngredientCatalogue =
  | { changed: false }
  | { changed: true; ingredients: Ingredient[]; etag: string | null };

// The whole catalogue in one request (GET /ingredients/catalogue). With the
// version saved last time, an unchanged catalogue answers 304 and nothing is
// downloaded. Browsers keep and revalidate the response themselves (it's
// sent as private, no-cache), so the web leaves the header to the browser.
// An API from before that request existed gets the catalogue page by page.
export async function getIngredientCatalogue(savedEtag: string | null): Promise<IngredientCatalogue> {
  try {
    const response = await apiConditionalGet<Ingredient[]>(
      "/ingredients/catalogue",
      Platform.OS === "web" ? null : savedEtag
    );
    if (response.notModified) return { changed: false };
    return { changed: true, ingredients: response.data, etag: response.etag };
  } catch (error) {
    if (!isApiClientError(error) || error.status !== 404) throw error;
    const ingredients = await fetchAllPages((limit, offset) => getIngredients({ limit, offset }));
    return { changed: true, ingredients, etag: null };
  }
}
