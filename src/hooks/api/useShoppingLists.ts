// Not used since lists are made, renamed and deleted through the outbox
// (listCommands.ts). Kept by the founder's choice on 14 Oct 2026, so knip.json
// ignores this file.
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { shoppingListsApi } from "../../lib/api";
import { queryKeys } from "../../lib/query/queryKeys";
import {
  ShoppingListCreateRequest,
  ShoppingListUpdateRequest,
} from "../../types/api";

export function useCreateShoppingListMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: ShoppingListCreateRequest) =>
      shoppingListsApi.createShoppingList(payload),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: queryKeys.shoppingLists.all }),
  });
}

export function useRenameShoppingListMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      shoppingListId,
      payload,
    }: {
      shoppingListId: string;
      payload: ShoppingListUpdateRequest;
    }) => shoppingListsApi.updateShoppingListById(shoppingListId, payload),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: queryKeys.shoppingLists.all }),
  });
}

export function useDeleteShoppingListMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (shoppingListId: string) =>
      shoppingListsApi.deleteShoppingListById(shoppingListId),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: queryKeys.shoppingLists.all }),
  });
}
