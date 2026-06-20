import { useMutation } from "@tanstack/react-query";
import { plannerApi } from "../../lib/api";

export function useBudgetPlannerMutation() {
  return useMutation({
    mutationFn: plannerApi.getBudgetPlan,
  });
}

export function useKitchenPlannerMutation() {
  return useMutation({
    mutationFn: plannerApi.getKitchenMatches,
  });
}

export function useTimetablePlannerMutation() {
  return useMutation({
    mutationFn: plannerApi.getMealPlan,
  });
}

export const useMealPlanMutation = useTimetablePlannerMutation;
