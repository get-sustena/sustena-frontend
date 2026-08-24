import {
  ClearCheckedShoppingItemsResponse,
  ShoppingList,
  ShoppingListItem,
  ShoppingListItemCreate,
  ShoppingListItemUpdate,
  SuccessResponse,
} from "../../types/api";
import { apiRequest } from "./client";

export function getShoppingList() {
  return apiRequest<ShoppingList>({
    url: "/me/shopping-list",
    method: "GET",
  });
}

export function addShoppingListItem(payload: ShoppingListItemCreate) {
  return apiRequest<ShoppingListItem>({
    url: "/me/shopping-list/items",
    method: "POST",
    data: payload,
  });
}

export function updateShoppingListItem(
  itemId: string,
  payload: ShoppingListItemUpdate
) {
  return apiRequest<ShoppingListItem>({
    url: `/me/shopping-list/items/${itemId}`,
    method: "PATCH",
    data: payload,
  });
}

export function deleteShoppingListItem(itemId: string) {
  return apiRequest<SuccessResponse>({
    url: `/me/shopping-list/items/${itemId}`,
    method: "DELETE",
  });
}

export function clearCheckedShoppingListItems() {
  return apiRequest<ClearCheckedShoppingItemsResponse>({
    url: "/me/shopping-list/items/actions/clear-checked",
    method: "DELETE",
  });
}
