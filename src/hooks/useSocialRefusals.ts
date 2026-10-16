import { useQueryClient } from "@tanstack/react-query";
import { useSQLiteContext } from "expo-sqlite";
import { useEffect } from "react";
import { runWriteTransaction } from "../db/writeTransaction";
import { queryKeys } from "../lib/query/queryKeys";
import { socialCopy } from "../lib/socialCopy";
import { dropRefusedSocialChanges, type RefusedSocialChange } from "../lib/sync/socialChanges";
import { onSyncFinished } from "../lib/sync/syncEvents";
import { useFavoritesStore } from "../store/favoritesStore";
import { showToast } from "../store/uiStore";
import { useCreatorFollow } from "./useCreatorFollow";
import { useFavoriteCommands } from "./useFavoriteCommands";
import { useRecipeRating } from "./useRecipeRating";

// When the server refuses a follow, save or rating, the button goes back and
// a toast offers Try again, which makes the same change again (PRD v6.9
// section 20). Mounted once, for the whole app.
export function useSocialRefusals() {
  const db = useSQLiteContext();
  const queryClient = useQueryClient();
  const favorites = useFavoriteCommands();
  const follow = useCreatorFollow();
  const rating = useRecipeRating();

  useEffect(() => {
    function tryAgain(change: RefusedSocialChange) {
      switch (change.kind) {
        case "favorite_add":
        case "favorite_remove":
          return favorites.setFavorite(change.recipeId, change.kind === "favorite_add");
        case "creator_follow":
        case "creator_unfollow":
          return follow.setFollowing(change.creatorId, change.kind === "creator_follow", change.name);
        case "recipe_rate":
          return rating.rate(change.recipeId, change.rating);
      }
    }

    function message(change: RefusedSocialChange) {
      switch (change.kind) {
        case "favorite_add":
          return socialCopy.couldNotSave;
        case "favorite_remove":
          return socialCopy.couldNotRemove;
        case "creator_follow":
          return socialCopy.couldNotFollow(change.name);
        case "creator_unfollow":
          return socialCopy.couldNotUnfollow(change.name);
        case "recipe_rate":
          return socialCopy.couldNotRate;
      }
    }

    return onSyncFinished(() => {
      void (async () => {
        const refused = await runWriteTransaction(db, dropRefusedSocialChanges);
        const last = refused.at(-1);
        if (!last) return;
        const store = useFavoritesStore.getState();
        for (const change of refused) {
          if (change.kind === "favorite_add") store.removeFavorite(change.recipeId);
          if (change.kind === "favorite_remove") store.addFavorite(change.recipeId);
        }
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: queryKeys.creators.pendingFollows }),
          queryClient.invalidateQueries({ queryKey: queryKeys.recipes.pendingRatings }),
          queryClient.invalidateQueries({ queryKey: queryKeys.favorites.all }),
        ]);
        showToast(message(last), "danger", { label: socialCopy.tryAgain, onPress: () => void tryAgain(last) });
      })().catch((error: unknown) => console.warn("Couldn't undo a refused change", error));
    });
  }, [db, queryClient, favorites, follow, rating]);
}
