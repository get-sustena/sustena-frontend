import { useQuery } from "@tanstack/react-query";
import { unitsApi } from "../../lib/api";
import { queryKeys } from "../../lib/query/queryKeys";

// Unit metadata is immutable reference data for the lifetime of the app session.
export function useUnitsQuery() {
  return useQuery({
    queryKey: queryKeys.units.all,
    queryFn: unitsApi.getUnits,
    staleTime: Infinity,
    gcTime: Infinity,
  });
}
