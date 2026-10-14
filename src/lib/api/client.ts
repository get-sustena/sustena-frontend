
import {
  AxiosError,
  AxiosInstance,
  AxiosRequestConfig,
  create as createAxiosInstance,
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
import { createSessionRefresher } from "./sessionRefresh";
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

const apiClient: AxiosInstance = createAxiosInstance({
  baseURL: API_BASE_URL,
  timeout: API_TIMEOUT_MS,
  headers: {
    Accept: "application/json",
  },
});

// Rules for when a failed refresh ends the session: sessionRefresh.ts.
const sessionRefresher = createSessionRefresher({
  readRefreshToken: getRefreshToken,
  requestRefresh: async (refreshToken) => {
    const response = await apiClient.post<RefreshTokenResponse>(
      "/auth/refresh",
      { refreshToken },
      { _skipAuthRefresh: true } as AxiosRequestConfig
    );
    return response.data;
  },
  saveTokens: (tokens) =>
    saveAuthTokens({ accessToken: tokens.accessToken, refreshToken: tokens.refreshToken }),
  clearTokens: clearAuthTokens,
  endSession: notifyAuthFailure,
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

    const outcome = await sessionRefresher.refresh();

    // The refresher has already ended the session, once.
    if (outcome.kind === "rejected") {
      return Promise.reject(toApiClientError(error));
    }

    // Offline, a timeout or a server error: still signed in. The caller gets
    // the temporary error, so it can try again later.
    if (outcome.kind === "unavailable") {
      return Promise.reject(toApiClientError(outcome.error));
    }

    originalRequest.headers.Authorization = `Bearer ${outcome.tokens.accessToken}`;

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

// A GET that may be answered "304 Not Modified" (RFC 9110 conditional
// request): with the version the caller saved, an unchanged resource comes
// back with no body.
export async function apiConditionalGet<TResponse>(url: string, savedEtag: string | null) {
  try {
    const response = await apiClient.get<TResponse>(url, {
      headers: savedEtag ? { "If-None-Match": savedEtag } : undefined,
      validateStatus: (status) => (status >= 200 && status < 300) || status === 304,
    });
    const etag = response.headers.etag;
    return {
      notModified: response.status === 304,
      data: response.data,
      etag: typeof etag === "string" ? etag : null,
    };
  } catch (error) {
    throw toApiClientError(error);
  }
}

