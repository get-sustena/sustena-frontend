import type { SavedMealPlan, SavedMealPlanCreateRequest } from "../../types/api";
import { apiRequest } from "./client";

// `clientMutationId` makes a retry after a lost reply return the plan
// already made.
export function createMealPlan(payload: SavedMealPlanCreateRequest & { clientMutationId?: string }) {
  return apiRequest<SavedMealPlan>({
    url: "/meal-plans",
    method: "POST",
    data: payload,
  });
}

// The two meals trade places. A replay of the same clientMutationId returns
// the plan without swapping back.
export function swapMealPlanItems(
  mealPlanId: string,
  sourceItemId: string,
  targetItemId: string,
  clientMutationId: string
) {
  return apiRequest<SavedMealPlan>({
    url: `/meal-plans/${mealPlanId}/items/${sourceItemId}/swap`,
    method: "POST",
    data: { targetItemId, clientMutationId },
  });
}

export function getMealPlans() {
  return apiRequest<SavedMealPlan[]>({
    url: "/meal-plans",
    method: "GET",
  });
}

export function renameMealPlan(mealPlanId: string, change: { name: string }) {
  return apiRequest<SavedMealPlan>({
    url: `/meal-plans/${mealPlanId}`,
    method: "PATCH",
    data: change,
  });
}

export function deleteMealPlan(mealPlanId: string) {
  return apiRequest<void>({
    url: `/meal-plans/${mealPlanId}`,
    method: "DELETE",
  });
}
