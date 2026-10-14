import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { pantryApi } from "../../lib/api";
import { queryKeys } from "../../lib/query/queryKeys";
import { useStartLoading } from "./useStartLoading";

export function usePantryQuery() {
  const startLoading = useStartLoading();
  return useQuery({
    queryKey: queryKeys.pantry.me,
    queryFn: pantryApi.getPantry,
    enabled: !startLoading,
  });
}

export function useAddPantryItemsMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: pantryApi.addPantryItems,
    onSuccess: (data) => {
      queryClient.setQueryData(queryKeys.pantry.me, data);
      queryClient.invalidateQueries({ queryKey: queryKeys.recommendations.home });
    },
  });
}

export function useRemovePantryItemMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: pantryApi.removePantryItem,
    onSuccess: (data) => {
      queryClient.setQueryData(queryKeys.pantry.me, data);
      queryClient.invalidateQueries({ queryKey: queryKeys.recommendations.home });
    },
  });
}
