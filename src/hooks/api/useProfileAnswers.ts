import { useQuery } from "@tanstack/react-query";
import { useSQLiteContext } from "expo-sqlite";
import { useEffect } from "react";
import { profileAnswersApi } from "../../lib/api";
import { withPendingSettings } from "../../lib/settings/settingsCommands";
import { queryKeys } from "../../lib/query/queryKeys";
import { useProfileAnswersStore } from "../../store/profileAnswersStore";
import { useStartLoading } from "./useStartLoading";

export function useProfileAnswersQuery() {
  const hydrateProfileAnswers = useProfileAnswersStore(
    (state) => state.hydrateProfileAnswers
  );

  const db = useSQLiteContext();
  const startLoading = useStartLoading();
  const query = useQuery({
    queryKey: queryKeys.profileAnswers.me,
    // A change not sent yet stays on top of the server's copy (QAD-01).
    queryFn: async () =>
      withPendingSettings(db, "profile_answers_update", await profileAnswersApi.getProfileAnswers()),
    enabled: !startLoading,
  });

  useEffect(() => {
    if (query.data) {
      hydrateProfileAnswers(query.data);
    }
  }, [hydrateProfileAnswers, query.data]);

  return query;
}

