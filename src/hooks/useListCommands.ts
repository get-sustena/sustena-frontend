import { useSQLiteContext } from "expo-sqlite";
import { useMemo } from "react";
import { runWriteTransaction } from "../db/writeTransaction";
import { createLocalId } from "../lib/id";
import { createListCommands } from "../lib/shopping/listCommands";
import { requestSync } from "../lib/sync/syncEvents";

// Making, renaming and deleting shopping lists: on the phone at once, on
// the server through the outbox (QAD-04).
export function useListCommands() {
  const db = useSQLiteContext();
  return useMemo(
    () =>
      createListCommands({
        db,
        transact: (work) => runWriteTransaction(db, work),
        now: () => new Date().toISOString(),
        newId: createLocalId,
        requestSync,
      }),
    [db]
  );
}
