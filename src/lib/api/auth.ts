
import {
  AuthResponse,
  ChangePasswordRequest,
  CurrentUserUpdateRequest,
  ForgotPasswordRequest,
  ForgotPasswordResponse,
  LoginRequest,
  LogoutRequest,
  LogoutResponse,
  ResetPasswordRequest,
  ResetPasswordResponse,
  SignupRequest,
  User,
  VerifyResetCodeRequest,
  VerifyResetCodeResponse,
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

export function updateMe(payload: CurrentUserUpdateRequest) {
  return apiRequest<User>({
    url: "/auth/me",
    method: "PUT",
    data: payload,
  });
}

export function changePassword(payload: ChangePasswordRequest) {
  return apiRequest<{ success: boolean }>({
    url: "/auth/change-password",
    method: "POST",
    data: payload,
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
      // Local sign-out must not depend on server availability.
    });
  }

  await clearAuthTokens();
}

export function forgotPassword(payload: ForgotPasswordRequest) {
  return apiRequest<ForgotPasswordResponse>({
    url: "/auth/forgot-password",
    method: "POST",
    data: payload,
    _skipAuthRefresh: true,
  });
}

export function verifyResetCode(payload: VerifyResetCodeRequest) {
  return apiRequest<VerifyResetCodeResponse>({
    url: "/auth/verify-reset-code",
    method: "POST",
    data: payload,
    _skipAuthRefresh: true,
  });
}

export function resetPassword(payload: ResetPasswordRequest) {
  return apiRequest<ResetPasswordResponse>({
    url: "/auth/reset-password",
    method: "POST",
    data: payload,
    _skipAuthRefresh: true,
  });
}
