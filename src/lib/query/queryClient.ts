import { QueryClient } from "@tanstack/react-query";

// The backend runs on a free-tier host that can take 30-50s to wake from a
// cold start, so queries get more retries with a longer backoff than the
// react-query default — a single failed request right after idle shouldn't
// surface as a hard error.
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      retryDelay: (attemptIndex) => Math.min(2000 * 2 ** attemptIndex, 20_000),
      staleTime: 60_000,
      gcTime: 5 * 60_000,
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
    },
    mutations: {
      retry: 1,
      retryDelay: 2000,
    },
  },
});
