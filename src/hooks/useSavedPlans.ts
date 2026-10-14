import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useSQLiteContext } from "expo-sqlite";
import { useEffect, useMemo } from "react";
import { runWriteTransaction } from "../db/writeTransaction";
import { mealPlansApi } from "../lib/api";
import { createLocalId } from "../lib/id";
import { createPlanCommands, getSavedPlans, replacePlansKeepingPendingEdits } from "../lib/planner/planCommands";
import { onSyncFinished, requestSync } from "../lib/sync/syncEvents";
import { useIsOnline } from "./useIsOnline";

const SAVED_PLANS_KEY = ["meal-plans", "saved"] as const;
const SERVER_PLANS_KEY = ["meal-plans", "server"] as const;

// Saved meal plans (MP-01) as the phone has them, so they open offline.
// Online, the server's list is merged in, keeping changes not sent yet.
export function useSavedPlans() {
  const db = useSQLiteContext();
  const queryClient = useQueryClient();
  const isOnline = useIsOnline();
  const query = useQuery({
    queryKey: SAVED_PLANS_KEY,
    queryFn: () => getSavedPlans(db),
    networkMode: "always",
  });

  // One fetch however many screens show the plans.
  useQuery({
    queryKey: SERVER_PLANS_KEY,
    enabled: isOnline,
    staleTime: 30_000,
    queryFn: async () => {
      const serverPlans = await mealPlansApi.getMealPlans();
      await runWriteTransaction(db, (tx) => replacePlansKeepingPendingEdits(tx, serverPlans));
      await queryClient.invalidateQueries({ queryKey: SAVED_PLANS_KEY });
      return serverPlans.length;
    },
  });

  // A plan saved offline takes the server's id once it's sent.
  useEffect(
    () =>
      onSyncFinished(() => {
        void queryClient.invalidateQueries({ queryKey: SAVED_PLANS_KEY });
      }),
    [queryClient]
  );

  return { plans: query.data ?? [], isLoading: query.isLoading };
}

// Saving, renaming, swapping and deleting plans: on the phone at once, on
// the server through the outbox.
export function usePlanCommands() {
  const db = useSQLiteContext();
  const queryClient = useQueryClient();
  return useMemo(() => {
    const commands = createPlanCommands({
      db,
      transact: (work) => runWriteTransaction(db, work),
      now: () => new Date().toISOString(),
      newId: createLocalId,
      requestSync,
    });
    const shown = <T,>(work: Promise<T>) =>
      work.then(async (result) => {
        await queryClient.invalidateQueries({ queryKey: SAVED_PLANS_KEY });
        return result;
      });
    return {
      savePlan: (...args: Parameters<typeof commands.savePlan>) => shown(commands.savePlan(...args)),
      renamePlan: (...args: Parameters<typeof commands.renamePlan>) => shown(commands.renamePlan(...args)),
      swapMeals: (...args: Parameters<typeof commands.swapMeals>) => shown(commands.swapMeals(...args)),
      deletePlan: (...args: Parameters<typeof commands.deletePlan>) => shown(commands.deletePlan(...args)),
    };
  }, [db, queryClient]);
}
