// A 422 reply's messages by field, for showing each under its field. Shared
// by the app and its tests, so nothing here imports React Native.
import type { ApiValidationError } from "../../types/api.ts";

function isValidationReply(payload: unknown): payload is ApiValidationError {
  return (
    typeof payload === "object" &&
    payload !== null &&
    "detail" in payload &&
    Array.isArray((payload as ApiValidationError).detail)
  );
}

// The field a message is about: the last name in its location, such as
// "newPassword" in ["body", "newPassword"].
function fieldName(loc: (string | number)[]) {
  const field = [...loc].reverse().find((part) => typeof part === "string");
  return typeof field === "string" ? field : undefined;
}

// Pydantic starts the messages a validator raises with "Value error, ";
// the rest is written for the person using the app.
const VALIDATOR_PREFIX = /^Value error, /;

export function validationFieldErrors(payload: unknown) {
  if (!isValidationReply(payload)) return {};
  const errors: Record<string, string> = {};
  for (const item of payload.detail) {
    const field = fieldName(item.loc);
    if (field && !errors[field]) errors[field] = item.msg.replace(VALIDATOR_PREFIX, "");
  }
  return errors;
}
