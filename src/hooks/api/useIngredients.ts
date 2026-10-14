import { useQuery } from "@tanstack/react-query";
import { useSQLiteContext } from "expo-sqlite";
import {
  getSavedIngredientCatalog,
  saveIngredientCatalog,
} from "../../db/ingredientCatalogRepository";
import { getIngredientCatalogue } from "../../lib/api/ingredients";
import { queryKeys } from "../../lib/query/queryKeys";

// The ingredient catalogue: the copy saved on the device shows at once
// (TanStack placeholder data) while the server is asked whether it changed.
// Unchanged, the saved copy is used; changed, the new one is saved for next
// time. Offline, the saved copy stands in.
export function useIngredientCatalogQuery() {
  const db = useSQLiteContext();
  const saved = useQuery({
    queryKey: queryKeys.ingredients.savedCatalog,
    queryFn: () => getSavedIngredientCatalog(db),
    // Read from the device, so it runs offline too.
    networkMode: "always",
    staleTime: Infinity,
    gcTime: Infinity,
  });

  return useQuery({
    queryKey: queryKeys.ingredients.catalog,
    queryFn: async () => {
      const savedCopy = await getSavedIngredientCatalog(db).catch(() => null);
      try {
        const catalogue = await getIngredientCatalogue(savedCopy?.etag ?? null);
        if (!catalogue.changed && savedCopy) return savedCopy.ingredients;
        if (!catalogue.changed) throw new Error("The catalogue answered 304 with no saved copy.");
        void saveIngredientCatalog(db, catalogue.ingredients, catalogue.etag).catch(() => undefined);
        return catalogue.ingredients;
      } catch (error) {
        if (savedCopy) return savedCopy.ingredients;
        throw error;
      }
    },
    placeholderData: saved.data?.ingredients,
    // Offline, run once so the saved copy stands in, instead of waiting.
    networkMode: "offlineFirst",
    // Asking costs a few bytes when nothing changed, so it's asked whenever a
    // screen that needs the catalogue opens, at most once a minute (the
    // recipe page needs it too, and opens often).
    staleTime: 60_000,
    gcTime: Infinity,
  });
}
