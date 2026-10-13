import type {
  SavedMealPlan,
  SavedMealPlanCreateRequest,
  ShoppingList,
} from "../../types/api";
import { apiRequest } from "./client";

export function createMealPlan(payload: SavedMealPlanCreateRequest) {
  return apiRequest<SavedMealPlan>({
    url: "/meal-plans",
    method: "POST",
    data: payload,
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
