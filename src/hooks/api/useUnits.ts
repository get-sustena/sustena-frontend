import { useQuery } from "@tanstack/react-query";
import { unitsApi } from "../../lib/api";
import { queryKeys } from "../../lib/query/queryKeys";

// The unit conversion catalog is static reference data (~50 rows) that essentially never
// changes at runtime, so it's fetched once and kept fresh indefinitely rather than refetched
// on the usual staleTime/window-focus schedule.
export function useUnitsQuery() {
  return useQuery({
    queryKey: queryKeys.units.all,
    queryFn: unitsApi.getUnits,
    staleTime: Infinity,
    gcTime: Infinity,
  });
}
