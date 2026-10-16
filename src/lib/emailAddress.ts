import { z } from "zod";

const emailSchema = z.email();

// Every email field in the app checks with this before sending.
export function isEmailAddress(value: string) {
  return emailSchema.safeParse(value.trim()).success;
}
