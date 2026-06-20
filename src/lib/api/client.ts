// src/lib/api/client.ts

import axios, {
  AxiosError,
  AxiosInstance,
  AxiosRequestConfig,
  InternalAxiosRequestConfig,
} from "axios";
import { RefreshTokenResponse } from "../../types/api";
import {
  ACCESS_TOKEN_EXPIRED_STATUS,
  API_BASE_URL,
  API_TIMEOUT_MS,
} from "./config";
import { notifyAuthFailure } from "./authEvents";
import { toApiClientError } from "./errors";
import {
  clearAuthTokens,
  getAccessToken,
  getRefreshToken,
  saveAuthTokens,
} from "./tokenStorage";

export type AppAxiosRequestConfig = AxiosRequestConfig & {
  _skipAuthRefresh?: boolean;
};

type RetryableAxiosRequestConfig = InternalAxiosRequestConfig & {
  _retry?: boolean;
  _skipAuthRefresh?: boolean;
};

let refreshPromise: Promise<RefreshTokenResponse | null> | null = null;

export const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: API_TIMEOUT_MS,
  headers: {
    Accept: "application/json",
  },
});

apiClient.interceptors.request.use(async (config) => {
  const shouldSkipAuth = (config as RetryableAxiosRequestConfig)
    ._skipAuthRefresh;

  if (shouldSkipAuth) {
    return config;
  }

  const accessToken = await getAccessToken();

  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }

  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as
      | RetryableAxiosRequestConfig
      | undefined;

    const status = error.response?.status;

    if (
      status !== ACCESS_TOKEN_EXPIRED_STATUS ||
      !originalRequest ||
      originalRequest._retry ||
      originalRequest._skipAuthRefresh
    ) {
      return Promise.reject(toApiClientError(error));
    }

    originalRequest._retry = true;

    const refreshedTokens = await refreshTokens();

    if (!refreshedTokens) {
      await clearAuthTokens();
      notifyAuthFailure();
      return Promise.reject(toApiClientError(error));
    }

    originalRequest.headers.Authorization = `Bearer ${refreshedTokens.accessToken}`;

    try {
      return await apiClient(originalRequest);
    } catch (retryError) {
      return Promise.reject(toApiClientError(retryError));
    }
  }
);

export async function apiRequest<TResponse>(
  config: AppAxiosRequestConfig
): Promise<TResponse> {
  try {
    const response = await apiClient.request<TResponse>(config);
    return response.data;
  } catch (error) {
    throw toApiClientError(error);
  }
}

async function refreshTokens() {
  if (!refreshPromise) {
    refreshPromise = performRefresh().finally(() => {
      refreshPromise = null;
    });
  }

  return refreshPromise;
}

async function performRefresh(): Promise<RefreshTokenResponse | null> {
  const refreshToken = await getRefreshToken();

  if (!refreshToken) {
    return null;
  }

  try {
    const response = await apiClient.post<RefreshTokenResponse>(
      "/auth/refresh",
      {
        refreshToken,
      },
      {
        _skipAuthRefresh: true,
      } as AxiosRequestConfig
    );

    await saveAuthTokens({
      accessToken: response.data.accessToken,
      refreshToken: response.data.refreshToken,
    });

    return response.data;
  } catch {
    await clearAuthTokens();
    notifyAuthFailure();
    return null;
  }
}
