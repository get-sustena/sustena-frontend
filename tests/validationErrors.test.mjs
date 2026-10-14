import assert from "node:assert/strict";
import { test } from "node:test";
import { validationFieldErrors } from "../src/lib/api/validationErrors.ts";

// Backend's B05 reply to a new password over 72 bytes.
const tooLong = (field) => ({
  detail: [
    {
      loc: ["body", field],
      type: "value_error",
      msg: "Value error, This password is too long. Use a shorter password.",
    },
  ],
});

test("B05: a too-long password on sign-up shows the server's message under the password field", () => {
  assert.deepEqual(validationFieldErrors(tooLong("password")), {
    password: "This password is too long. Use a shorter password.",
  });
});

test("B05: on reset and change, the message goes under the new password field", () => {
  assert.deepEqual(validationFieldErrors(tooLong("newPassword")), {
    newPassword: "This password is too long. Use a shorter password.",
  });
});

test("a reply that isn't a field error gives no field messages", () => {
  assert.deepEqual(validationFieldErrors({ detail: "Invalid credentials" }), {});
  assert.deepEqual(validationFieldErrors(undefined), {});
});

test("only the first message for a field is kept, and other fields keep their own", () => {
  assert.deepEqual(
    validationFieldErrors({
      detail: [
        { loc: ["body", "email"], type: "value_error", msg: "Value error, Enter a valid email address." },
        { loc: ["body", "email"], type: "missing", msg: "Field required" },
        { loc: ["body", "firstName"], type: "missing", msg: "Field required" },
      ],
    }),
    { email: "Enter a valid email address.", firstName: "Field required" }
  );
});
