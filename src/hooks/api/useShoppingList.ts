import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { shoppingListApi } from "../../lib/api";
import { queryKeys } from "../../lib/query/queryKeys";
import { ShoppingListItemUpdate } from "../../types/api";

export function useShoppingListQuery() {
  return useQuery({
    queryKey: queryKeys.shoppingList.active,
    queryFn: shoppingListApi.getShoppingList,
  });
}

export function useAddShoppingListItemMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: shoppingListApi.addShoppingListItem,
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: queryKeys.shoppingList.active }),
  });
}

export function useUpdateShoppingListItemMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      itemId,
      payload,
    }: {
      itemId: string;
      payload: ShoppingListItemUpdate;
    }) => shoppingListApi.updateShoppingListItem(itemId, payload),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: queryKeys.shoppingList.active }),
  });
}

export function useDeleteShoppingListItemMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: shoppingListApi.deleteShoppingListItem,
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: queryKeys.shoppingList.active }),
  });
}

export function useClearCheckedShoppingListItemsMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: shoppingListApi.clearCheckedShoppingListItems,
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: queryKeys.shoppingList.active }),
  });
}
