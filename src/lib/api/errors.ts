
import { AxiosError } from "axios";
import { ApiError, ApiValidationError } from "../../types/api";
import { API_BASE_URL } from "./config";

export class ApiClientError extends Error {
  status: number;
  code?: string;
  payload?: unknown;

  constructor({
    message,
    status,
    code,
    payload,
  }: {
    message: string;
    status: number;
    code?: string;
    payload?: unknown;
  }) {
    super(message);

    this.name = "ApiClientError";
    this.status = status;
    this.code = code;
    this.payload = payload;
  }
}

export function isApiClientError(error: unknown): error is ApiClientError {
  return error instanceof ApiClientError;
}

export function getApiErrorMessage(error: unknown) {
  if (isApiClientError(error)) {
    return error.message;
  }

  if (isAxiosApiError(error)) {
    return toApiClientError(error).message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Something went wrong. Please try again.";
}

export function getApiValidationFieldErrors(error: unknown) {
  const payload = getErrorPayload(error);

  if (!isValidationErrorPayload(payload)) {
    return {};
  }

  return payload.detail.reduce<Record<string, string>>((acc, item) => {
    const field = getValidationFieldName(item.loc);

    if (!field || acc[field]) {
      return acc;
    }

    acc[field] = item.msg;
    return acc;
  }, {});
}

export function toApiClientError(error: unknown): ApiClientError {
  if (isApiClientError(error)) {
    return error;
  }

  if (isAxiosApiError(error)) {
    const status = error.response?.status ?? 0;
    const payload = error.response?.data;
    const message = error.response
      ? parseErrorPayload(payload)
      : getNetworkErrorMessage(error);

    return new ApiClientError({
      message,
      status,
      code: getErrorCode(payload),
      payload,
    });
  }

  if (error instanceof Error) {
    return new ApiClientError({
      message: error.message,
      status: 0,
      payload: error,
    });
  }

  return new ApiClientError({
    message: "Something went wrong. Please try again.",
    status: 0,
    payload: error,
  });
}

function getNetworkErrorMessage(error: AxiosError) {
  if (error.code === "ECONNABORTED") {
    return "The API request timed out. Check that the backend is running and reachable from this device.";
  }

  return `Could not reach the API at ${API_BASE_URL}. Check that the backend is running, the port is correct, and this device can access that host.`;
}

export function parseErrorPayload(payload: unknown) {
  if (isValidationErrorPayload(payload)) {
    return payload.detail
      .map((item) => {
        const field = getValidationFieldName(item.loc);

        if (!field) {
          return item.msg;
        }

        return `${formatFieldLabel(field)}: ${item.msg}`;
      })
      .join("\n");
  }

  if (isApiErrorPayload(payload)) {
    return payload.detail;
  }

  return "Something went wrong. Please try again.";
}

function getErrorPayload(error: unknown) {
  if (isApiClientError(error)) {
    return error.payload;
  }

  if (isAxiosApiError(error)) {
    return error.response?.data;
  }

  return undefined;
}

function getValidationFieldName(loc: (string | number)[]) {
  const field = [...loc].reverse().find((item) => typeof item === "string");

  return typeof field === "string" ? field : undefined;
}

function formatFieldLabel(field: string) {
  return field
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function getErrorCode(payload: unknown) {
  if (
    typeof payload === "object" &&
    payload !== null &&
    "code" in payload &&
    typeof (payload as { code?: unknown }).code === "string"
  ) {
    return (payload as { code: string }).code;
  }

  return undefined;
}

function isAxiosApiError(error: unknown): error is AxiosError {
  return Boolean(
    error &&
      typeof error === "object" &&
      "isAxiosError" in error &&
      (error as AxiosError).isAxiosError
  );
}

function isApiErrorPayload(payload: unknown): payload is ApiError {
  return (
    typeof payload === "object" &&
    payload !== null &&
    "detail" in payload &&
    typeof (payload as ApiError).detail === "string"
  );
}

function isValidationErrorPayload(
  payload: unknown
): payload is ApiValidationError {
  return (
    typeof payload === "object" &&
    payload !== null &&
    "detail" in payload &&
    Array.isArray((payload as ApiValidationError).detail)
  );
}
