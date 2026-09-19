import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { profileAnswersApi } from "../../lib/api";
import { queryKeys } from "../../lib/query/queryKeys";
import { useProfileAnswersStore } from "../../store/profileAnswersStore";

export function useProfileAnswersQuery() {
  const hydrateProfileAnswers = useProfileAnswersStore(
    (state) => state.hydrateProfileAnswers
  );

  const query = useQuery({
    queryKey: queryKeys.profileAnswers.me,
    queryFn: profileAnswersApi.getProfileAnswers,
  });

  useEffect(() => {
    if (query.data) {
      hydrateProfileAnswers(query.data);
    }
  }, [hydrateProfileAnswers, query.data]);

  return query;
}

export function useUpdateProfileAnswersMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: profileAnswersApi.updateProfileAnswers,
    onSuccess: (answers) => {
      queryClient.setQueryData(queryKeys.profileAnswers.me, answers);
      queryClient.invalidateQueries({ queryKey: queryKeys.recommendations.home });
    },
  });
}
