// Shared by the app and its tests, so nothing here imports React Native.
import type { RefreshTokenResponse } from "../../types/api";

// Refreshing an expired sign-in (F01). Only the server confirming the
// refresh token is no good (401 from /auth/refresh, or a malformed request)
// ends the session, and it ends it once. Offline, timeouts, rate limits and
// server errors keep the tokens, so the person stays signed in and the
// request can be tried again later.

type RefreshOutcome =
  | { kind: "refreshed"; tokens: RefreshTokenResponse }
  | { kind: "rejected" }
  | { kind: "unavailable"; error: unknown };

type Dependencies = {
  readRefreshToken: () => Promise<string | null>;
  requestRefresh: (refreshToken: string) => Promise<RefreshTokenResponse>;
  saveTokens: (tokens: RefreshTokenResponse) => Promise<void>;
  clearTokens: () => Promise<void>;
  endSession: () => void;
};

function isConfirmedRejection(error: unknown) {
  const status =
    typeof error === "object" && error !== null && "status" in error
      ? Number((error as { status: unknown }).status)
      : 0;
  return status === 400 || status === 401 || status === 403 || status === 422;
}

export function createSessionRefresher(dependencies: Dependencies) {
  let inFlight: Promise<RefreshOutcome> | null = null;

  async function reject(): Promise<RefreshOutcome> {
    await dependencies.clearTokens();
    dependencies.endSession();
    return { kind: "rejected" };
  }

  async function run(): Promise<RefreshOutcome> {
    const refreshToken = await dependencies.readRefreshToken();
    if (!refreshToken) return reject();

    try {
      const tokens = await dependencies.requestRefresh(refreshToken);
      await dependencies.saveTokens(tokens);
      return { kind: "refreshed", tokens };
    } catch (error) {
      if (isConfirmedRejection(error)) return reject();
      return { kind: "unavailable", error };
    }
  }

  return {
    // Requests that expire at the same time share one refresh.
    refresh() {
      inFlight ??= run().finally(() => {
        inFlight = null;
      });
      return inFlight;
    },
  };
}
