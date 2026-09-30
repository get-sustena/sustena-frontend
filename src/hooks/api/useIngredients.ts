import { useQuery } from "@tanstack/react-query";
import { ingredientsApi } from "../../lib/api";
import { getAllIngredients } from "../../lib/api/ingredients";
import { queryKeys } from "../../lib/query/queryKeys";
import { IngredientSearchParams } from "../../types/api";

export function useIngredientsQuery(params?: IngredientSearchParams) {
  return useQuery({
    queryKey: queryKeys.ingredients.list(params),
    queryFn: () => ingredientsApi.getIngredients(params),
  });
}

export function useIngredientCategoriesQuery() {
  return useQuery({
    queryKey: queryKeys.ingredients.categories,
    queryFn: ingredientsApi.getIngredientCategories,
    staleTime: Infinity,
    gcTime: Infinity,
  });
}

export function useIngredientCatalogQuery() {
  return useQuery({
    queryKey: queryKeys.ingredients.catalog,
    queryFn: getAllIngredients,
    staleTime: Infinity,
    gcTime: Infinity,
  });
}
