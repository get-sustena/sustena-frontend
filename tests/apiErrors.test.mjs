import "./helpers/typescript.mjs";
import assert from "node:assert/strict";
import { test } from "node:test";
import { AxiosError } from "axios";

const previousDevelopment = globalThis.__DEV__;
globalThis.__DEV__ = false;
const { getApiErrorMessage, getApiValidationFieldErrors, toApiClientError } = await import("../src/lib/api/errors.ts");
if (previousDevelopment === undefined) delete globalThis.__DEV__;
else globalThis.__DEV__ = previousDevelopment;

test("a timeout gives the household user a connection and retry action", () => {
  const failure = new AxiosError("timeout of 60000ms exceeded", "ECONNABORTED");

  assert.equal(
    getApiErrorMessage(toApiClientError(failure)),
    "This is taking longer than expected. Check your connection and try again.",
  );
});

test("a network failure does not ask the user to debug the backend or expose its address", () => {
  const failure = new AxiosError("Network Error", "ERR_NETWORK", { url: "https://api.example.com/private" });

  assert.equal(
    getApiErrorMessage(failure),
    "Could not connect. Check your internet connection and try again.",
  );
});

test("server error and validation details still reach the existing consumer interface", () => {
  const rateLimit = new AxiosError("Request failed", "ERR_BAD_REQUEST", undefined, undefined, {
    status: 429, data: { detail: "Try again in 30 seconds.", code: "RATE_LIMITED" },
  });
  const converted = toApiClientError(rateLimit);
  assert.equal(getApiErrorMessage(converted), "Try again in 30 seconds.");
  assert.equal(converted.status, 429);
  assert.equal(converted.code, "RATE_LIMITED");

  const invalid = new AxiosError("Request failed", "ERR_BAD_REQUEST", undefined, undefined, {
    status: 422, data: { detail: [{ loc: ["body", "email"], msg: "Enter a valid email." }] },
  });
  assert.deepEqual(getApiValidationFieldErrors(invalid), { email: "Enter a valid email." });
});
