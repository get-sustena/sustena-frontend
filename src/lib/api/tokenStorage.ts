// src/lib/api/tokenStorage.ts

import * as SecureStore from "expo-secure-store";

const ACCESS_TOKEN_KEY = "cookease_access_token";
const REFRESH_TOKEN_KEY = "cookease_refresh_token";

export type StoredAuthTokens = {
  accessToken: string;
  refreshToken: string;
};

export async function getAccessToken() {
  return SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
}

export async function getRefreshToken() {
  return SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
}

export async function getStoredAuthTokens(): Promise<StoredAuthTokens | null> {
  const [accessToken, refreshToken] = await Promise.all([
    getAccessToken(),
    getRefreshToken(),
  ]);

  if (!accessToken || !refreshToken) {
    return null;
  }

  return {
    accessToken,
    refreshToken,
  };
}

export async function saveAuthTokens(tokens: StoredAuthTokens) {
  await Promise.all([
    SecureStore.setItemAsync(ACCESS_TOKEN_KEY, tokens.accessToken),
    SecureStore.setItemAsync(REFRESH_TOKEN_KEY, tokens.refreshToken),
  ]);
}

export async function clearAuthTokens() {
  await Promise.all([
    SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY),
    SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY),
  ]);
}
