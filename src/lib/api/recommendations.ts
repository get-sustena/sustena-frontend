import type { RecommendationListResponse } from "../../types/api";
import { apiRequest } from "./client";

export function getRecommendations(limit = 12) {
  return apiRequest<RecommendationListResponse>({
    url: "/me/recommendations",
    method: "GET",
    params: { limit },
  });
}
