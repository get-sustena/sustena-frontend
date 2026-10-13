import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSQLiteContext } from "expo-sqlite";
import { getCookedDay, saveCookedDay } from "../../db/cookedRecipesRepository";
import { recipesApi } from "../../lib/api";
import { getLagosDay } from "../../lib/lagosDay";
import { queryKeys } from "../../lib/query/queryKeys";
import type { RecipeSource } from "../../lib/recipeSource";
import { useAuthStore } from "../../store/authStore";
import { showToast } from "../../store/uiStore";

// "I cooked it" (PRD v6.8 section 16): one POST /recipes/{id}/cooked per
// person, recipe and Lagos day. After it, the button reads "Cooked today"
// until the Lagos day changes, including after leaving and coming back.
export function useRecipeCooked(recipeId: string, source?: RecipeSource) {
  const db = useSQLiteContext();
  const queryClient = useQueryClient();
  const userId = useAuthStore((state) => state.user?.id ?? "");
  const cookedDayKey = queryKeys.recipes.cookedDay(userId, recipeId);

  const cookedDay = useQuery({
    queryKey: cookedDayKey,
    queryFn: () => getCookedDay(db, userId, recipeId),
    enabled: Boolean(userId),
  });

  const markCooked = useMutation({
    mutationFn: () => recipesApi.markRecipeCooked(recipeId, source),
    // counted: false only means today's cook was already counted, so the
    // button shows "Cooked today" either way.
    onSuccess: async () => {
      const today = getLagosDay();
      queryClient.setQueryData(cookedDayKey, today);
      await saveCookedDay(db, userId, recipeId, today).catch(() => undefined);
    },
    onError: () => {
      showToast("That didn't save. Check your connection and try again.", "danger");
    },
  });

  const cookedToday = cookedDay.data === getLagosDay();

  return {
    cookedToday,
    isSaving: markCooked.isPending,
    markCooked: () => {
      if (cookedToday || markCooked.isPending) return;
      markCooked.mutate();
    },
  };
}
