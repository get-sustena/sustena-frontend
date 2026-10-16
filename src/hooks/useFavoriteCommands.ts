import { useSQLiteContext } from "expo-sqlite";
import { useMemo } from "react";
import { runWriteTransaction } from "../db/writeTransaction";
import { createFavoriteCommands } from "../lib/favorites/favoriteCommands";
import { createLocalId } from "../lib/id";
import { noteOfflineChange } from "../lib/sync/offlineNotice";
import { requestSync } from "../lib/sync/syncEvents";
import { useFavoritesStore } from "../store/favoritesStore";

// Saves or unsaves a recipe: on the phone at once, on the server through the
// outbox.
export function useFavoriteCommands() {
  const db = useSQLiteContext();
  return useMemo(() => {
    const commands = createFavoriteCommands({
      db,
      transact: (work) => runWriteTransaction(db, work),
      now: () => new Date().toISOString(),
      newId: createLocalId,
      requestSync,
    });
    return {
      async setFavorite(recipeId: string, favorite: boolean) {
        const store = useFavoritesStore.getState();
        if (favorite) store.addFavorite(recipeId);
        else store.removeFavorite(recipeId);
        noteOfflineChange();
        await commands.setFavorite(recipeId, favorite);
      },
    };
  }, [db]);
}
