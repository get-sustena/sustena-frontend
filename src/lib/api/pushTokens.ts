import { PushTokenRegisterRequest, PushTokenResponse } from "../../types/api";
import { apiRequest } from "./client";

// A registered token means this phone gets meal reminders. The backend
// upserts by token, so registering again is safe.
export function registerPushToken(payload: PushTokenRegisterRequest) {
  return apiRequest<PushTokenResponse>({
    url: "/me/push-tokens",
    method: "POST",
    data: payload,
  });
}

export function unregisterPushToken(token: string) {
  return apiRequest<void>({
    // Expo tokens contain brackets: ExponentPushToken[...].
    url: `/me/push-tokens/${encodeURIComponent(token)}`,
    method: "DELETE",
  });
}
