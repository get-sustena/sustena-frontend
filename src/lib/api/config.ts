export const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_BASE_URL ?? "http://192.168.0.177:9000/api/v1";

export const ACCESS_TOKEN_EXPIRED_STATUS = 401;

// The production backend runs on a free-tier host that can take 30-50s to
// wake up from a cold start after idling, so the timeout needs enough
// headroom to survive the very first request rather than aborting into it.
export const API_TIMEOUT_MS = 60_000;

// Local API URL notes:
// - iOS simulator can use localhost.
// - Android emulator should use 10.0.2.2.
// - Physical devices need your computer's LAN IP address.
