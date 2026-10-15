
import {
  AgreementRequest,
  AuthResponse,
  ChangePasswordRequest,
  CurrentUserUpdateRequest,
  DeleteAccountRequest,
  ForgotPasswordRequest,
  ForgotPasswordResponse,
  LoginRequest,
  LogoutRequest,
  LogoutResponse,
  ResendConfirmationResponse,
  ResetPasswordRequest,
  ResetPasswordResponse,
  SendEmailCodeResponse,
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

export function agreeToTerms(payload: AgreementRequest) {
  return apiRequest<User>({
    url: "/auth/me/agreement",
    method: "POST",
    data: payload,
  });
}

export function resendConfirmationEmail() {
  return apiRequest<ResendConfirmationResponse>({
    url: "/auth/verify-email/resend",
    method: "POST",
  });
}

export function sendEmailCode() {
  return apiRequest<SendEmailCodeResponse>({
    url: "/auth/verify-email/code/send",
    method: "POST",
  });
}

// Answers with the account, now confirmed.
export function verifyEmailCode(code: string) {
  return apiRequest<User>({
    url: "/auth/verify-email/code",
    method: "POST",
    data: { code },
  });
}

// Deletes the account and everything in it on the server, and signs out
// every device.
export function deleteMe(payload: DeleteAccountRequest) {
  return apiRequest<void>({
    url: "/auth/me",
    method: "DELETE",
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
