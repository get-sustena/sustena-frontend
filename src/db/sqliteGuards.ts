export async function runWithSqliteRetry<T>(
  task: () => Promise<T>,
  options: {
    retries?: number;
    delayMs?: number;
  } = {}
): Promise<T> {
  const retries = options.retries ?? 3;
  const delayMs = options.delayMs ?? 120;

  for (let attempt = 0; ; attempt += 1) {
    try {
      return await task();
    } catch (error) {
      if (!isDatabaseLockedError(error) || attempt >= retries) {
        throw error;
      }

      await sleep(delayMs * (attempt + 1));
    }
  }
}

export function isClosedResourceError(error: unknown) {
  return (
    error instanceof Error &&
    error.message.toLowerCase().includes("access to closed resource")
  );
}

export function isDatabaseLockedError(error: unknown) {
  if (!(error instanceof Error)) {
    return false;
  }

  const message = error.message.toLowerCase();

  return message.includes("database is locked") || message.includes("code 5");
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
