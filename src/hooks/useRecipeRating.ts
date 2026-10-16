import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useSQLiteContext } from "expo-sqlite";
import { useEffect, useMemo } from "react";
import { createLocalId } from "../lib/id";
import { queryKeys } from "../lib/query/queryKeys";
import { createRatingCommands, pendingRatings } from "../lib/ratings/ratingCommands";
import { noteOfflineChange } from "../lib/sync/offlineNotice";
import { onSyncFinished, requestSync } from "../lib/sync/syncEvents";

const NOTHING_PENDING = new Map<string, number>();

// Rates a recipe: shown at once, sent through the outbox.
export function useRecipeRating() {
  const db = useSQLiteContext();
  const queryClient = useQueryClient();
  const pendingQuery = useQuery({
    queryKey: queryKeys.recipes.pendingRatings,
    queryFn: () => pendingRatings(db),
    networkMode: "always",
  });
  const pending = pendingQuery.data ?? NOTHING_PENDING;

  // What was sent is already on the recipe page (lib/social/sentChanges).
  useEffect(
    () =>
      onSyncFinished(() => {
        void queryClient.invalidateQueries({ queryKey: queryKeys.recipes.pendingRatings });
      }),
    [queryClient]
  );

  return useMemo(() => {
    const commands = createRatingCommands({ db, newId: createLocalId, requestSync });
    return {
      ratingOf(recipeId: string, server: number | null) {
        return pending.get(recipeId) ?? server ?? 0;
      },
      async rate(recipeId: string, rating: number) {
        queryClient.setQueryData(queryKeys.recipes.pendingRatings, new Map(pending).set(recipeId, rating));
        noteOfflineChange();
        await commands.rate(recipeId, rating);
        await queryClient.invalidateQueries({ queryKey: queryKeys.recipes.pendingRatings });
      },
    };
  }, [db, pending, queryClient]);
}
