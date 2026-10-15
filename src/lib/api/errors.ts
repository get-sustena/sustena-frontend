
import { AxiosError } from "axios";
import { ApiError, ApiValidationError } from "../../types/api";
import { API_BASE_URL } from "./config";
import { validationFieldErrors } from "./validationErrors";

class ApiClientError extends Error {
  status: number;
  code?: string;
  payload?: unknown;
  // From a 429's Retry-After header, when the browser is allowed to read it.
  retryAfterSeconds?: number;

  constructor({
    message,
    status,
    code,
    payload,
    retryAfterSeconds,
  }: {
    message: string;
    status: number;
    code?: string;
    payload?: unknown;
    retryAfterSeconds?: number;
  }) {
    super(message);

    this.name = "ApiClientError";
    this.status = status;
    this.code = code;
    this.payload = payload;
    this.retryAfterSeconds = retryAfterSeconds;
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

// A 422's messages by field (validationErrors.ts), to show under each field.
export function getApiValidationFieldErrors(error: unknown) {
  return validationFieldErrors(getErrorPayload(error));
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
      retryAfterSeconds: readRetryAfterSeconds(error.response?.headers?.["retry-after"]),
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

// Retry-After in seconds; the HTTP-date form isn't sent by this API.
function readRetryAfterSeconds(header: unknown) {
  const seconds = Number(header);
  return Number.isFinite(seconds) && seconds > 0 ? Math.ceil(seconds) : undefined;
}

function getNetworkErrorMessage(error: AxiosError) {
  if (error.code === "ECONNABORTED") {
    return "The API request timed out. Check that the backend is running and reachable from this device.";
  }

  return `Could not reach the API at ${API_BASE_URL}. Check that the backend is running, the port is correct, and this device can access that host.`;
}

function parseErrorPayload(payload: unknown) {
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
