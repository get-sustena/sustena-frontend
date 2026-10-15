import { useQuery } from "@tanstack/react-query";
import { useSQLiteContext } from "expo-sqlite";
import { getSavedUnits, saveUnits } from "../../db/unitsRepository";
import { unitsApi } from "../../lib/api";
import { queryKeys } from "../../lib/query/queryKeys";

// Unit metadata is reference data for the lifetime of the app session. A
// copy is kept on the phone, so amounts convert offline too (SL-06).
export function useUnitsQuery() {
  const db = useSQLiteContext();
  return useQuery({
    queryKey: queryKeys.units.all,
    queryFn: async () => {
      try {
        const units = await unitsApi.getUnits();
        void saveUnits(db, units).catch(() => undefined);
        return units;
      } catch (error) {
        const saved = await getSavedUnits(db).catch(() => null);
        if (saved) return saved;
        throw error;
      }
    },
    // Offline, run once so the saved copy stands in, instead of waiting.
    networkMode: "offlineFirst",
    staleTime: Infinity,
    gcTime: Infinity,
  });
}
