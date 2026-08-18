import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { creatorsApi } from "../../lib/api";
import { queryKeys } from "../../lib/query/queryKeys";
import {
  CreatorProfileWriteRequest,
  CreatorRecipeListParams,
  CreatorReportRequest,
} from "../../types/api";

export function useMyCreatorProfileQuery() {
  return useQuery({
    queryKey: queryKeys.creators.me,
    queryFn: creatorsApi.getMyCreatorProfile,
    retry: false,
  });
}

export function useCreatorProfileQuery(handle?: string) {
  return useQuery({
    queryKey: queryKeys.creators.handle(handle ?? ""),
    queryFn: () => creatorsApi.getCreatorByHandle(handle ?? ""),
    enabled: Boolean(handle),
  });
}

export function useCreatorRecipesQuery(
  handle?: string,
  params?: CreatorRecipeListParams
) {
  return useQuery({
    queryKey: queryKeys.creators.recipes(handle ?? "", params),
    queryFn: () => creatorsApi.getCreatorRecipes(handle ?? "", params),
    enabled: Boolean(handle),
  });
}

export function useSavedCreatorsQuery() {
  return useQuery({
    queryKey: queryKeys.creators.saved,
    queryFn: creatorsApi.getSavedCreators,
  });
}

export function useCreatorHandleAvailabilityQuery(
  handle: string,
  enabled = true
) {
  return useQuery({
    queryKey: queryKeys.creators.handleAvailability(handle),
    queryFn: () => creatorsApi.getHandleAvailability(handle),
    enabled: enabled && handle.trim().length >= 3,
    staleTime: 30_000,
  });
}

export function useUpsertCreatorProfileMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreatorProfileWriteRequest) =>
      creatorsApi.upsertMyCreatorProfile(payload),
    onSuccess: (profile) => {
      queryClient.setQueryData(queryKeys.creators.me, profile);
      queryClient.setQueryData(
        queryKeys.creators.handle(profile.handle),
        profile
      );
      queryClient.invalidateQueries({ queryKey: queryKeys.creators.all });
    },
  });
}

export function useSaveCreatorMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ creatorId, save }: { creatorId: string; save: boolean }) =>
      save
        ? creatorsApi.saveCreator(creatorId)
        : creatorsApi.unsaveCreator(creatorId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.creators.all });
    },
  });
}

export function useReportCreatorMutation(creatorId: string) {
  return useMutation({
    mutationFn: (payload: CreatorReportRequest) =>
      creatorsApi.reportCreator(creatorId, payload),
  });
}
