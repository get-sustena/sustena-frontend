import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useSQLiteContext } from "expo-sqlite";
import { useMemo, useState } from "react";
import { getCookedDay } from "../../db/cookedRecipesRepository";
import { runWriteTransaction } from "../../db/writeTransaction";
import { createCookedCommands } from "../../lib/cooked/cookedCommands";
import { createLocalId } from "../../lib/id";
import { getLagosDay } from "../../lib/lagosDay";
import { queryKeys } from "../../lib/query/queryKeys";
import type { RecipeSource } from "../../lib/recipeSource";
import { requestSync } from "../../lib/sync/syncEvents";
import { useAuthStore } from "../../store/authStore";

// "I cooked it" (PRD v6.8 section 16): counted once per person, recipe and
// Lagos day. The tap is saved on the phone and sent through the outbox, so
// it works offline; the button reads "Cooked today" until the Lagos day
// changes, including after leaving and coming back.
export function useRecipeCooked(recipeId: string, source?: RecipeSource) {
  const db = useSQLiteContext();
  const queryClient = useQueryClient();
  const userId = useAuthStore((state) => state.user?.id ?? "");
  const cookedDayKey = queryKeys.recipes.cookedDay(userId, recipeId);
  const [isSaving, setIsSaving] = useState(false);

  const cookedDay = useQuery({
    queryKey: cookedDayKey,
    queryFn: () => getCookedDay(db, userId, recipeId),
    enabled: Boolean(userId),
    networkMode: "always",
  });

  const commands = useMemo(
    () =>
      createCookedCommands({
        db,
        transact: (work) => runWriteTransaction(db, work),
        now: () => new Date(),
        newId: createLocalId,
        requestSync,
      }),
    [db]
  );

  const cookedToday = cookedDay.data === getLagosDay();

  return {
    cookedToday,
    isSaving,
    markCooked: async () => {
      if (!userId || cookedToday || isSaving) return;
      setIsSaving(true);
      try {
        const day = await commands.markCooked({ userId, recipeId, source });
        queryClient.setQueryData(cookedDayKey, day);
      } finally {
        setIsSaving(false);
      }
    },
  };
}
