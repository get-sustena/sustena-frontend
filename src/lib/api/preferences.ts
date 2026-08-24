import { UserPreferences, UserPreferencesUpdate } from "../../types/api";
import { apiRequest } from "./client";

export function getPreferences() {
  return apiRequest<UserPreferences>({
    url: "/me/preferences",
    method: "GET",
  });
}

export function updatePreferences(payload: UserPreferencesUpdate) {
  return apiRequest<UserPreferences>({
    url: "/me/preferences",
    method: "PUT",
    data: payload,
  });
}
