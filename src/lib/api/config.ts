export const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_BASE_URL ?? "http://192.168.0.177:9000/api/v1";

export const ACCESS_TOKEN_EXPIRED_STATUS = 401;
export const API_TIMEOUT_MS = 30_000;

// Local API URL notes:
// - iOS simulator can use localhost.
// - Android emulator should use 10.0.2.2.
// - Physical devices need your computer's LAN IP address.
