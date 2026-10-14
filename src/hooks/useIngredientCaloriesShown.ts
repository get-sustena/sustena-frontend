import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useSQLiteContext } from "expo-sqlite";
import {
  getIngredientCaloriesShown,
  saveIngredientCaloriesShown,
} from "../db/ingredientCaloriesRepository";
import { queryKeys } from "../lib/query/queryKeys";

// The eye on the recipe page's Ingredients heading. The choice is remembered.
export function useIngredientCaloriesShown() {
  const db = useSQLiteContext();
  const queryClient = useQueryClient();
  const shown = useQuery({
    queryKey: queryKeys.preferences.ingredientCalories,
    queryFn: () => getIngredientCaloriesShown(db),
  });

  const isShown = shown.data ?? true;

  return {
    isShown,
    toggle: () => {
      const next = !isShown;
      queryClient.setQueryData(queryKeys.preferences.ingredientCalories, next);
      void saveIngredientCaloriesShown(db, next).catch(() => undefined);
    },
  };
}
