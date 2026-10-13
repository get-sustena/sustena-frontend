import { useQuery } from "@tanstack/react-query";
import { getAllIngredients } from "../../lib/api/ingredients";
import { queryKeys } from "../../lib/query/queryKeys";

export function useIngredientCatalogQuery() {
  return useQuery({
    queryKey: queryKeys.ingredients.catalog,
    queryFn: getAllIngredients,
    staleTime: Infinity,
    gcTime: Infinity,
  });
}
