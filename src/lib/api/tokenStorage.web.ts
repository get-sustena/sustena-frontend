const ACCESS_TOKEN_KEY = "cookease_access_token";
const REFRESH_TOKEN_KEY = "cookease_refresh_token";

export type StoredAuthTokens = {
  accessToken: string;
  refreshToken: string;
};

function getStorage() {
  if (typeof window === "undefined") {
    return null;
  }

  return window.localStorage;
}

export async function getAccessToken() {
  return getStorage()?.getItem(ACCESS_TOKEN_KEY) ?? null;
}

export async function getRefreshToken() {
  return getStorage()?.getItem(REFRESH_TOKEN_KEY) ?? null;
}

export async function getStoredAuthTokens(): Promise<StoredAuthTokens | null> {
  const accessToken = await getAccessToken();
  const refreshToken = await getRefreshToken();

  if (!accessToken || !refreshToken) {
    return null;
  }

  return { accessToken, refreshToken };
}

export async function saveAuthTokens(tokens: StoredAuthTokens) {
  const storage = getStorage();
  storage?.setItem(ACCESS_TOKEN_KEY, tokens.accessToken);
  storage?.setItem(REFRESH_TOKEN_KEY, tokens.refreshToken);
}

export async function clearAuthTokens() {
  const storage = getStorage();
  storage?.removeItem(ACCESS_TOKEN_KEY);
  storage?.removeItem(REFRESH_TOKEN_KEY);
}
