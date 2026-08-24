const configuredApiBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL?.trim();
const productionApiBaseUrl = "https://api.getsustena.com/api/v1";
const normalizedConfiguredApiBaseUrl = configuredApiBaseUrl?.replace(/\/$/, "");

export const API_BASE_URL = normalizedConfiguredApiBaseUrl
  ? !__DEV__ && isPrivateNetworkUrl(normalizedConfiguredApiBaseUrl)
    ? productionApiBaseUrl
    : normalizedConfiguredApiBaseUrl
  : __DEV__
    ? "http://192.168.0.177:9000/api/v1"
    : productionApiBaseUrl;

export const ACCESS_TOKEN_EXPIRED_STATUS = 401;

// Keep a bounded request timeout for slow or interrupted network connections.
export const API_TIMEOUT_MS = 60_000;

// Local API URL notes:
// - iOS simulator can use localhost.
// - Android emulator should use 10.0.2.2.
// - Physical devices need your computer's LAN IP address.

function isPrivateNetworkUrl(value: string) {
  try {
    const hostname = new URL(value).hostname.toLowerCase();
    if (hostname === "localhost" || hostname === "0.0.0.0") return true;
    if (hostname === "127.0.0.1" || hostname === "::1") return true;
    if (hostname.startsWith("192.168.") || hostname.startsWith("10.")) {
      return true;
    }

    const match = hostname.match(/^172\.(\d{1,2})\./);
    return match ? Number(match[1]) >= 16 && Number(match[1]) <= 31 : false;
  } catch {
    return false;
  }
}
