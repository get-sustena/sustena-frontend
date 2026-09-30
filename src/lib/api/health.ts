
import { HealthResponse } from "../../types/api";
import { apiRequest } from "./client";

export function getHealth() {
  return apiRequest<HealthResponse>({
    url: "/health",
    method: "GET",
  });
}
