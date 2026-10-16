import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useSQLiteContext } from "expo-sqlite";
import { useEffect, useMemo } from "react";
import { createFollowCommands, followState, pendingFollows } from "../lib/creators/followCommands";
import { createLocalId } from "../lib/id";
import { queryKeys } from "../lib/query/queryKeys";
import { noteOfflineChange } from "../lib/sync/offlineNotice";
import { onSyncFinished, requestSync } from "../lib/sync/syncEvents";

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

  // What was sent is already on the pages (lib/social/sentChanges).
  useEffect(
    () =>
      onSyncFinished(() => {
        void queryClient.invalidateQueries({ queryKey: queryKeys.creators.pendingFollows });
      }),
    [queryClient]
  );

  return useMemo(() => {
    const commands = createFollowCommands({ db, newId: createLocalId, requestSync });
    return {
      stateOf(creatorId: string, server: { following: boolean; followerCount?: number }) {
        return followState(server, pending.get(creatorId));
      },
      async setFollowing(creatorId: string, following: boolean, name: string) {
        queryClient.setQueryData(queryKeys.creators.pendingFollows, new Map(pending).set(creatorId, following));
        noteOfflineChange();
        await commands.setFollowing(creatorId, following, name);
        await queryClient.invalidateQueries({ queryKey: queryKeys.creators.pendingFollows });
      },
    };
  }, [db, pending, queryClient]);
}
