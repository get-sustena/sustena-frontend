import type { PantryResponse } from "../../types/api";
import { apiRequest } from "./client";

export function getPantry() {
  return apiRequest<PantryResponse>({ url: "/pantry", method: "GET" });
}

export function addPantryItems(ingredientIds: string[]) {
  return apiRequest<PantryResponse>({
    url: "/pantry/items",
    method: "POST",
    data: { ingredientIds },
  });
}

export function removePantryItem(ingredientId: string) {
  return apiRequest<PantryResponse>({
    url: `/pantry/items/${encodeURIComponent(ingredientId)}`,
    method: "DELETE",
  });
}
