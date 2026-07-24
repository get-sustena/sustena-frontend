import { Unit } from "../../types/api";
import { apiRequest } from "./client";

export function getUnits() {
  return apiRequest<Unit[]>({
    url: "/units",
    method: "GET",
  });
}
