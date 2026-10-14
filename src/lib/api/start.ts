import type { StartResponse } from "../../types/api";
import type { MealTime } from "../mealTime";
import { apiRequest } from "./client";

export function getStart(mealTime: MealTime, limit = 12) {
  return apiRequest<StartResponse>({
    url: "/me/start",
    method: "GET",
    params: { limit, mealTime },
  });
}
