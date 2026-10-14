import { useQuery } from "@tanstack/react-query";
import { useSQLiteContext } from "expo-sqlite";
import {
  getSavedIngredientCatalog,
  saveIngredientCatalog,
} from "../../db/ingredientCatalogRepository";
import { getAllIngredients } from "../../lib/api/ingredients";
import { queryKeys } from "../../lib/query/queryKeys";

// The ingredient catalogue: the copy saved on the device shows at once
// (TanStack placeholder data) while a fresh copy loads, and the fresh copy
// is saved for next time. Offline, the saved copy stands in and is fetched
// again once it's an hour old.
export function useIngredientCatalogQuery() {
  const db = useSQLiteContext();
  const saved = useQuery({
    queryKey: queryKeys.ingredients.savedCatalog,
    queryFn: () => getSavedIngredientCatalog(db),
    staleTime: Infinity,
    gcTime: Infinity,
  });

  return useQuery({
    queryKey: queryKeys.ingredients.catalog,
    queryFn: async () => {
      try {
        const ingredients = await getAllIngredients();
        void saveIngredientCatalog(db, ingredients).catch(() => undefined);
        return ingredients;
      } catch (error) {
        const savedCopy = await getSavedIngredientCatalog(db).catch(() => null);
        if (savedCopy) return savedCopy;
        throw error;
      }
    },
    placeholderData: saved.data ?? undefined,
    // The catalogue rarely changes: fetched once an hour at most.
    staleTime: 60 * 60_000,
    gcTime: Infinity,
  });
}
