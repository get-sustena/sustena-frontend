import { useQuery } from "@tanstack/react-query";
import { useSQLiteContext } from "expo-sqlite";
import {
  getStoredFavorites,
  mapFavoriteRowToFavorite,
  replaceFavoritesKeepingPendingEdits,
} from "../../db/favoritesRepository";
import { runWriteTransaction } from "../../db/writeTransaction";
import { favoritesApi } from "../../lib/api";
import { queryKeys } from "../../lib/query/queryKeys";
import { useFavoritesStore } from "../../store/favoritesStore";

// The server's saved recipes. Each reply is saved on the phone merged with
// saves and unsaves not sent yet (QAD-01), and the phone's list follows it.
export function useFavoritesQuery() {
  const db = useSQLiteContext();
  return useQuery({
    queryKey: queryKeys.favorites.all,
    queryFn: async () => {
      const favorites = await favoritesApi.getFavorites();
      await runWriteTransaction(db, (tx) =>
        replaceFavoritesKeepingPendingEdits(
          tx,
          favorites.map((favorite) => favorite.recipeId),
          new Date().toISOString()
        )
      );
      const rows = await getStoredFavorites(db);
      useFavoritesStore.getState().hydrateFavorites(rows.map(mapFavoriteRowToFavorite));
      return favorites;
    },
  });
}
