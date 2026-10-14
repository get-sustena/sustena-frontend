import { useIsFetching } from "@tanstack/react-query";
import { queryKeys } from "../../lib/query/queryKeys";

// Whether the start-up request (GET /me/start) is on its way. It brings the
// pantry, preferences, profile answers, planner settings and Home's
// recommendations, so their own queries wait for it instead of asking the
// server a second time. If it fails, they ask for themselves.
export function useStartLoading() {
  return useIsFetching({ queryKey: queryKeys.start }) > 0;
}
