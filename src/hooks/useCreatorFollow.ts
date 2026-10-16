import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useSQLiteContext } from "expo-sqlite";
import { useEffect, useMemo } from "react";
import { createFollowCommands, followState, pendingFollows } from "../lib/creators/followCommands";
import { createLocalId } from "../lib/id";
import { queryKeys } from "../lib/query/queryKeys";
import { onSyncFinished, requestSync } from "../lib/sync/syncEvents";
import type { CreatorProfile, RecipeDetail } from "../types/api";

const NOTHING_PENDING = new Map<string, boolean>();

// Follows or unfollows a creator: shown at once, sent through the outbox.
export function useCreatorFollow() {
  const db = useSQLiteContext();
  const queryClient = useQueryClient();
  const pendingQuery = useQuery({
    queryKey: queryKeys.creators.pendingFollows,
    queryFn: () => pendingFollows(db),
    networkMode: "always",
  });
  const pending = pendingQuery.data ?? NOTHING_PENDING;

  // Once follows reach the server, the pages already open keep what was
  // shown (a recipe page isn't asked for again, that would count as an open)
  // and creator pages are asked for again.
  useEffect(
    () =>
      onSyncFinished(() => {
        const sent = queryClient.getQueryData<Map<string, boolean>>(queryKeys.creators.pendingFollows);
        sent?.forEach((following, creatorId) => {
          queryClient.setQueriesData<RecipeDetail>({ queryKey: ["recipes", "detail"] }, (recipe) =>
            recipe?.creator?.id === creatorId ? { ...recipe, creator: { ...recipe.creator, isFollowing: following } } : recipe
          );
          queryClient.setQueriesData<CreatorProfile>({ queryKey: ["creators", "handle"] }, (profile) => {
            if (profile?.id !== creatorId) return profile;
            const state = followState({ following: profile.isSaved, followerCount: profile.followerCount }, following);
            return { ...profile, isSaved: state.following, followerCount: state.followerCount ?? profile.followerCount };
          });
        });
        void queryClient.invalidateQueries({ queryKey: queryKeys.creators.all });
      }),
    [queryClient]
  );

  return useMemo(() => {
    const commands = createFollowCommands({ db, newId: createLocalId, requestSync });
    return {
      stateOf(creatorId: string, server: { following: boolean; followerCount?: number }) {
        return followState(server, pending.get(creatorId));
      },
      async setFollowing(creatorId: string, following: boolean) {
        queryClient.setQueryData(queryKeys.creators.pendingFollows, new Map(pending).set(creatorId, following));
        await commands.setFollowing(creatorId, following);
        await queryClient.invalidateQueries({ queryKey: queryKeys.creators.pendingFollows });
      },
    };
  }, [db, pending, queryClient]);
}
