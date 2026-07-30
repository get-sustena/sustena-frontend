import {
  BudgetPlannerRequest,
  BudgetPlannerResponse,
  KitchenPlannerRequest,
  KitchenPlannerResponse,
  MealPlanRequest,
  MealPlanResponse,
  PlannerSettings,
  PlannerSettingsUpdateRequest,
} from "../../types/api";
import { apiRequest } from "./client";

export function getBudgetPlan(payload: BudgetPlannerRequest) {
  return apiRequest<BudgetPlannerResponse>({
    url: "/planner/budget",
    method: "POST",
    data: payload,
  });
}

export function getPlannerSettings() {
  return apiRequest<PlannerSettings>({
    url: "/me/planner-settings",
    method: "GET",
  });
}

export function updatePlannerSettings(payload: PlannerSettingsUpdateRequest) {
  return apiRequest<PlannerSettings>({
    url: "/me/planner-settings",
    method: "PUT",
    data: payload,
  });
}

export function getKitchenMatches(payload: KitchenPlannerRequest) {
  return apiRequest<KitchenPlannerResponse>({
    url: "/planner/kitchen",
    method: "POST",
    data: payload,
  });
}

export function getMealPlan(payload: MealPlanRequest) {
  return apiRequest<MealPlanResponse>({
    url: "/planner/meal-plan",
    method: "POST",
    data: payload,
  });
}
