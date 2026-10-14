import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { useSQLiteContext, type SQLiteDatabase } from "expo-sqlite";
import { cacheRecipeDetail } from "../../db/recipeRepository";
import { getLocalRecipeById, getLocalRecipes } from "../../db/recipeRows";
import { recipesApi } from "../../lib/api";
import { queryKeys } from "../../lib/query/queryKeys";
import type { RecipeSource } from "../../lib/recipeSource";
import type { RecipeSearchParams } from "../../types/api";

function useRecipesQuery(params?: RecipeSearchParams) {
  return useQuery({
    queryKey: queryKeys.recipes.list(params),
    queryFn: () => recipesApi.getRecipes(params),
  });
}

export function useRecipesWithLocalFallback(params?: RecipeSearchParams) {
  const db = useSQLiteContext();
  const apiQuery = useRecipesQuery(params);
  // Offline the request waits ("paused") rather than failing; the recipes
  // kept on the phone show meanwhile (OFF-01).
  const showSavedRecipes = !apiQuery.data && (apiQuery.isError || apiQuery.isPaused);
  const localQuery = useQuery({
    queryKey: queryKeys.recipes.localFallback(params),
    queryFn: () => getLocalRecipes(db, params),
    enabled: showSavedRecipes,
    networkMode: "always",
  });

  const data = apiQuery.data ?? localQuery.data;
  const usingLocalFallback = showSavedRecipes && Boolean(localQuery.data);

  return {
    ...apiQuery,
    data,
    source: usingLocalFallback ? ("local" as const) : ("api" as const),
    isLoading: apiQuery.isLoading || (showSavedRecipes && localQuery.isLoading),
    isError: apiQuery.isError && localQuery.isError,
    error: localQuery.error ?? apiQuery.error,
    refetch: async () => {
      const [apiResult, localResult] = await Promise.all([
        apiQuery.refetch(),
        localQuery.refetch(),
      ]);

      return apiResult.data ? apiResult : localResult;
    },
  };
}

export function useInfiniteRecipesWithLocalFallback(
  params: Omit<RecipeSearchParams, "page"> = {}
) {
  const db = useSQLiteContext();

  return useInfiniteQuery({
    queryKey: queryKeys.recipes.infiniteList(params),
    initialPageParam: 1,
    queryFn: async ({ pageParam }) => {
      const pageParams = { ...params, page: pageParam };

      try {
        const data = await recipesApi.getRecipes(pageParams);
        return { data, source: "api" as const };
      } catch (apiError) {
        try {
          const data = await getLocalRecipes(db, pageParams);
          return { data, source: "local" as const };
        } catch {
          throw apiError;
        }
      }
    },
    // Offline, run once so the recipes kept on the phone show (OFF-01).
    networkMode: "offlineFirst",
    getNextPageParam: (lastPage) => {
      const { page, pageSize, total } = lastPage.data;
      return page * pageSize < total ? page + 1 : undefined;
    },
  });
}

// The source isn't part of the key: it only tells the backend where the
// open came from, and the recipe is the same wherever it was opened.
function useRecipeDetailQuery(recipeId?: string, source?: RecipeSource) {
  const db = useSQLiteContext();

  return useQuery({
    queryKey: queryKeys.recipes.detail(recipeId ?? ""),
    queryFn: () => fetchRecipeDetail(db, recipeId ?? "", source),
    enabled: Boolean(recipeId),
  });
}

// For screens opened from the recipe page, such as its nutrition page: they
// use the recipe already loaded, so opening them doesn't count as opening the
// recipe again. It's fetched only when it isn't loaded, as after a reload.
export function useLoadedRecipeDetail(recipeId?: string, source?: RecipeSource) {
  const db = useSQLiteContext();

  return useQuery({
    queryKey: queryKeys.recipes.detail(recipeId ?? ""),
    queryFn: () => fetchRecipeDetail(db, recipeId ?? "", source),
    enabled: Boolean(recipeId),
    staleTime: Infinity,
  });
}

async function fetchRecipeDetail(db: SQLiteDatabase, recipeId: string, source?: RecipeSource) {
  const recipe = await recipesApi.getRecipeById(recipeId, source);

  void cacheRecipeDetail(db, recipe).catch((error) => {
    console.error("Failed to cache recipe detail locally", error);
  });

  return recipe;
}

export function useRecipeDetailWithLocalFallback(recipeId?: string, source?: RecipeSource) {
  const db = useSQLiteContext();
  const apiQuery = useRecipeDetailQuery(recipeId, source);
  const localQuery = useQuery({
    queryKey: queryKeys.recipes.localFallbackDetail(recipeId ?? ""),
    queryFn: () => getLocalRecipeById(db, recipeId ?? ""),
    enabled: Boolean(recipeId),
    networkMode: "always",
  });

  const data = apiQuery.data ?? localQuery.data ?? undefined;
  const usingLocalFallback = !apiQuery.data && Boolean(localQuery.data);

  return {
    ...apiQuery,
    data,
    source: usingLocalFallback ? ("local" as const) : ("api" as const),
    // Offline the server's copy waits ("paused"), so the saved copy decides.
    isLoading: !data && (apiQuery.isLoading || localQuery.isLoading),
    isWaitingForConnection: !data && apiQuery.isPaused && !localQuery.isLoading,
    isError: apiQuery.isError && !localQuery.isLoading && !localQuery.data,
    // While the saved copy shows: whether the server's copy is still on its
    // way, or didn't come. Offline, the request waits ("paused") until the
    // connection is back, and that counts as not coming for now.
    isRefreshingSavedCopy: usingLocalFallback && apiQuery.isFetching,
    savedCopyRefreshFailed:
      usingLocalFallback && (apiQuery.isError || apiQuery.fetchStatus === "paused"),
    error: localQuery.error ?? apiQuery.error,
    refetch: async () => {
      const [apiResult, localResult] = await Promise.all([
        apiQuery.refetch(),
        localQuery.refetch(),
      ]);

      return apiResult.data ? apiResult : localResult;
    },
  };
}

