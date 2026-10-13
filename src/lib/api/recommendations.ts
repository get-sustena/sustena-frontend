import type { RecommendationListResponse } from "../../types/api";
import type { MealTime } from "../mealTime";
import { apiRequest } from "./client";

export function getRecommendations(limit = 12, mealTime?: MealTime) {
  return apiRequest<RecommendationListResponse>({
    url: "/me/recommendations",
    method: "GET",
    params: { limit, mealTime },
  });
}
