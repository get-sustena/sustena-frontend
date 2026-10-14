import { useSQLiteContext } from "expo-sqlite";
import { useMemo } from "react";
import { runWriteTransaction } from "../db/writeTransaction";
import { createLocalId } from "../lib/id";
import { createShoppingCommands } from "../lib/shopping/shoppingCommands";
import { requestSync } from "../lib/sync/syncEvents";

export function useShoppingCommands() {
  const db = useSQLiteContext();
  return useMemo(
    () =>
      createShoppingCommands({
        db,
        transact: (work) => runWriteTransaction(db, work),
        now: () => new Date().toISOString(),
        newId: createLocalId,
        requestSync,
      }),
    [db]
  );
}
