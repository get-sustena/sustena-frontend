import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useSQLiteContext } from "expo-sqlite";
import { useEffect } from "react";
import { runWriteTransaction } from "../db/writeTransaction";
import { queryKeys } from "../lib/query/queryKeys";
import { discardChange, listUnsavedChanges, retryChange } from "../lib/sync/outboxRepair";
import { notifySyncFinished, onSyncFinished, requestSync } from "../lib/sync/syncEvents";

// Edits the server refused (F02), with Retry and Discard for each.
export function useUnsavedChanges() {
  const db = useSQLiteContext();
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: queryKeys.unsavedChanges,
    queryFn: () => listUnsavedChanges(db),
    networkMode: "always",
  });

  // Each outbox run can refuse a change or clear one.
  useEffect(
    () =>
      onSyncFinished(() => {
        void queryClient.invalidateQueries({ queryKey: queryKeys.unsavedChanges });
      }),
    [queryClient]
  );

  return {
    changes: query.data ?? [],
    async retry(id: string) {
      await retryChange(db, id);
      requestSync();
      await query.refetch();
    },
    async discard(id: string) {
      await runWriteTransaction(db, (tx) => discardChange(tx, id));
      // Screens reload what they show from the phone, now undone.
      notifySyncFinished();
      await queryClient.invalidateQueries({ queryKey: queryKeys.favorites.all });
    },
  };
}
