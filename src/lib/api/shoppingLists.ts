// src/lib/api/shoppingLists.ts
// Multi-list collection resource (/shopping-lists). Distinct from
// shoppingList.ts, which always operates on the caller's single active list
// via the legacy /me/shopping-list/* convenience endpoints.

import {
  ShoppingList,
  ShoppingListCreateRequest,
  ShoppingListItem,
  ShoppingListItemCreateRequest,
  ShoppingListItemUpdateRequest,
  ShoppingListRecipeBatchRequest,
  ShoppingListUpdateRequest,
} from "../../types/api";
import { apiRequest } from "./client";

export function getShoppingLists() {
  return apiRequest<ShoppingList[]>({
    url: "/shopping-lists",
    method: "GET",
  });
}

export function createShoppingList(payload: ShoppingListCreateRequest) {
  return apiRequest<ShoppingList>({
    url: "/shopping-lists",
    method: "POST",
    data: payload,
  });
}

export function getShoppingListById(shoppingListId: string) {
  return apiRequest<ShoppingList>({
    url: `/shopping-lists/${shoppingListId}`,
    method: "GET",
  });
}

export function updateShoppingListById(
  shoppingListId: string,
  payload: ShoppingListUpdateRequest
) {
  return apiRequest<ShoppingList>({
    url: `/shopping-lists/${shoppingListId}`,
    method: "PATCH",
    data: payload,
  });
}

export function deleteShoppingListById(shoppingListId: string) {
  return apiRequest<void>({
    url: `/shopping-lists/${shoppingListId}`,
    method: "DELETE",
  });
}

export function addShoppingListItemToList(
  shoppingListId: string,
  payload: ShoppingListItemCreateRequest
) {
  return apiRequest<ShoppingListItem>({
    url: `/shopping-lists/${shoppingListId}/items`,
    method: "POST",
    data: payload,
  });
}

export function updateShoppingListItemInList(
  shoppingListId: string,
  itemId: string,
  payload: ShoppingListItemUpdateRequest
) {
  return apiRequest<ShoppingListItem>({
    url: `/shopping-lists/${shoppingListId}/items/${itemId}`,
    method: "PATCH",
    data: payload,
  });
}

export function deleteShoppingListItemFromList(
  shoppingListId: string,
  itemId: string
) {
  return apiRequest<void>({
    url: `/shopping-lists/${shoppingListId}/items/${itemId}`,
    method: "DELETE",
  });
}

export function restoreShoppingListItemInList(
  shoppingListId: string,
  itemId: string
) {
  return apiRequest<ShoppingListItem>({
    url: `/shopping-lists/${shoppingListId}/items/${itemId}/restore`,
    method: "POST",
  });
}

export function addRecipesToShoppingList(
  shoppingListId: string,
  payload: ShoppingListRecipeBatchRequest
) {
  return apiRequest<ShoppingList>({
    url: `/shopping-lists/${shoppingListId}/items/actions/add-recipes`,
    method: "POST",
    data: payload,
  });
}

export function setShoppingListItemsChecked(
  shoppingListId: string,
  itemIds: string[],
  checked: boolean
) {
  return apiRequest<ShoppingList>({
    url: `/shopping-lists/${shoppingListId}/items/actions/set-checked`,
    method: "PATCH",
    data: { itemIds, checked },
  });
}

export function clearCheckedShoppingListItems(shoppingListId: string) {
  return apiRequest<{ deleted: number }>({
    url: `/shopping-lists/${shoppingListId}/items/actions/clear-checked`,
    method: "DELETE",
  });
}
