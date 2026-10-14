import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSQLiteContext } from "expo-sqlite";
import { getLocalCreatorProfile, getLocalCreatorRecipes } from "../../db/recipeRows";
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

// Without a connection, a creator's page is built from the recipes kept on
// the phone (OFF-01). Each query runs once offline instead of waiting, and
// uses the saved copy when the server can't be reached.
async function withSavedCopy<T>(request: () => Promise<T>, saved: () => Promise<T | null>) {
  try {
    return await request();
  } catch (error) {
    const copy = await saved().catch(() => null);
    if (copy) return copy;
    throw error;
  }
}

export function useCreatorProfileQuery(handle?: string) {
  const db = useSQLiteContext();
  return useQuery({
    queryKey: queryKeys.creators.handle(handle ?? ""),
    queryFn: () =>
      withSavedCopy(
        () => creatorsApi.getCreatorByHandle(handle ?? ""),
        () => getLocalCreatorProfile(db, handle ?? "")
      ),
    enabled: Boolean(handle),
    networkMode: "offlineFirst",
  });
}

export function useCreatorRecipesQuery(
  handle?: string,
  params?: CreatorRecipeListParams
) {
  const db = useSQLiteContext();
  return useQuery({
    queryKey: queryKeys.creators.recipes(handle ?? "", params),
    queryFn: () =>
      withSavedCopy(
        () => creatorsApi.getCreatorRecipes(handle ?? "", params),
        () => getLocalCreatorRecipes(db, handle ?? "", params)
      ),
    enabled: Boolean(handle),
    networkMode: "offlineFirst",
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
