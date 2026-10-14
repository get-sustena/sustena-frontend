// Shared by the app and its tests, so nothing here imports React Native.

// How queued offline edits are replayed (F02). An edit leaves the queue only
// when the server accepts it, or when the person cancels it. A temporary
// failure (offline, timeout, rate limit, server error) keeps it and waits
// longer each time; a permanent one keeps it marked for repair instead of
// retrying it forever.

type ReplayableOperation = {
  id: string;
  attempts: number;
  // Milliseconds since the epoch; null when it can be tried at once.
  nextAttemptAt: number | null;
  needsAttention: boolean;
};

type ReplayStore<T extends ReplayableOperation> = {
  pending: () => Promise<T[]>;
  run: (operation: T) => Promise<void>;
  remove: (id: string) => Promise<void>;
  // Adds one to the attempts and sets when to try again.
  scheduleRetry: (id: string, nextAttemptAt: number) => Promise<void>;
  markNeedsAttention: (id: string, reason: string) => Promise<void>;
};

type ReplayOptions = {
  isOnline: () => boolean;
  // True while signing out: the run stops and changes nothing.
  isStopped: () => boolean;
  now: () => number;
  // The connection just came back, so edits waiting out a backoff go now.
  ignoreBackoff?: boolean;
};

const FIRST_RETRY_MS = 5_000;
const LONGEST_RETRY_MS = 10 * 60_000;

// 5 s, 10 s, 20 s … up to 10 minutes.
export function retryDelayMs(attempts: number) {
  return Math.min(FIRST_RETRY_MS * 2 ** Math.max(0, attempts - 1), LONGEST_RETRY_MS);
}

// A client error the same request will always get again. Offline (0),
// timeouts (408), rate limits (429), sign-in (401) and server errors (5xx)
// pass. So do errors that aren't from the API, such as a busy database.
function isPermanentFailure(error: unknown) {
  const status =
    typeof error === "object" && error !== null && "status" in error
      ? Number((error as { status: unknown }).status)
      : 0;
  return status >= 400 && status < 500 && ![401, 408, 429].includes(status);
}

export async function replayQueue<T extends ReplayableOperation>(
  store: ReplayStore<T>,
  { isOnline, isStopped, now, ignoreBackoff = false }: ReplayOptions
) {
  if (!isOnline()) return;

  for (const operation of await store.pending()) {
    if (isStopped()) return;
    if (operation.needsAttention) continue;
    // Edits are replayed in order, so one still waiting holds the rest back.
    if (!ignoreBackoff && operation.nextAttemptAt !== null && operation.nextAttemptAt > now()) return;

    try {
      await store.run(operation);
      await store.remove(operation.id);
    } catch (error) {
      if (isStopped()) return;

      if (isPermanentFailure(error)) {
        await store.markNeedsAttention(
          operation.id,
          error instanceof Error ? error.message : "The server didn't accept this change."
        );
        continue;
      }

      const attempts = operation.attempts + 1;
      await store.scheduleRetry(operation.id, now() + retryDelayMs(attempts));
      // A temporary failure will most likely hit the next edit too, and later
      // edits may depend on this one, so the run stops here.
      return;
    }
  }
}
