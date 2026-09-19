import type {
  SavedMealPlan,
  SavedMealPlanCreateRequest,
  SavedMealPlanUpdateRequest,
  ShoppingList,
} from "../../types/api";
import { apiRequest } from "./client";

export function getMealPlans(includeArchived = false) {
  return apiRequest<SavedMealPlan[]>({
    url: "/meal-plans",
    method: "GET",
    params: includeArchived ? { include_archived: true } : undefined,
  });
}

export function createMealPlan(payload: SavedMealPlanCreateRequest) {
  return apiRequest<SavedMealPlan>({
    url: "/meal-plans",
    method: "POST",
    data: payload,
  });
}

export function getMealPlan(mealPlanId: string) {
  return apiRequest<SavedMealPlan>({
    url: `/meal-plans/${mealPlanId}`,
    method: "GET",
  });
}

export function updateMealPlan(
  mealPlanId: string,
  payload: SavedMealPlanUpdateRequest
) {
  return apiRequest<SavedMealPlan>({
    url: `/meal-plans/${mealPlanId}`,
    method: "PATCH",
    data: payload,
  });
}

export function deleteMealPlan(mealPlanId: string) {
  return apiRequest<void>({
    url: `/meal-plans/${mealPlanId}`,
    method: "DELETE",
  });
}

export function swapMealPlanItems(
  mealPlanId: string,
  sourceItemId: string,
  targetItemId: string
) {
  return apiRequest<SavedMealPlan>({
    url: `/meal-plans/${mealPlanId}/items/${sourceItemId}/swap`,
    method: "POST",
    data: { targetItemId },
  });
}

export function addMealPlanToShoppingList(
  mealPlanId: string,
  shoppingListId: string,
  clientMutationId: string
) {
  return apiRequest<ShoppingList>({
    url: `/meal-plans/${mealPlanId}/shopping-list`,
    method: "POST",
    data: { shoppingListId, clientMutationId },
  });
}
