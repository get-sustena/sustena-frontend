// src/lib/api/auth.ts

import {
  AuthResponse,
  LoginRequest,
  LogoutAllResponse,
  LogoutRequest,
  LogoutResponse,
  SignupRequest,
  User,
} from "../../types/api";
import { apiRequest, AppAxiosRequestConfig } from "./client";
import {
  clearAuthTokens,
  getRefreshToken,
  saveAuthTokens,
} from "./tokenStorage";

export async function signup(payload: SignupRequest) {
  const response = await apiRequest<AuthResponse>({
    url: "/auth/signup",
    method: "POST",
    data: payload,
    _skipAuthRefresh: true,
  });
  await saveAuthTokens({
    accessToken: response.accessToken,
    refreshToken: response.refreshToken,
  });

  return response;
}

export async function login(payload: LoginRequest) {
  const response = await apiRequest<AuthResponse>({
    url: "/auth/login",
    method: "POST",
    data: payload,
    _skipAuthRefresh: true,
  });

  await saveAuthTokens({
    accessToken: response.accessToken,
    refreshToken: response.refreshToken,
  });

  return response;
}

export async function getMe() {
  return apiRequest<User>({
    url: "/auth/me",
    method: "GET",
  });
}

export async function logout() {
  const refreshToken = await getRefreshToken();

  if (refreshToken) {
    const payload: LogoutRequest = {
      refreshToken,
    };

    const config: AppAxiosRequestConfig = {
      url: "/auth/logout",
      method: "POST",
      data: payload,
      _skipAuthRefresh: true,
    };

    await apiRequest<LogoutResponse>(config).catch(() => {
      // Logout should clear local state even if the server request fails.
    });
  }

  await clearAuthTokens();
}

export async function logoutAll() {
  const response = await apiRequest<LogoutAllResponse>({
    url: "/auth/logout-all",
    method: "POST",
  });

  await clearAuthTokens();

  return response;
}
