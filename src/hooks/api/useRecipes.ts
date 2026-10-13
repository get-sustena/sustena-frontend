import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { useSQLiteContext } from "expo-sqlite";
import {
  cacheRecipeDetail,
  getLocalRecipeById,
  getLocalRecipes,
} from "../../db/recipeRepository";
import { recipesApi } from "../../lib/api";
import { queryKeys } from "../../lib/query/queryKeys";
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
  const localQuery = useQuery({
    queryKey: queryKeys.recipes.localFallback(params),
    queryFn: () => getLocalRecipes(db, params),
    enabled: apiQuery.isError,
  });

  const data = apiQuery.data ?? localQuery.data;
  const usingLocalFallback = apiQuery.isError && Boolean(localQuery.data);

  return {
    ...apiQuery,
    data,
    source: usingLocalFallback ? ("local" as const) : ("api" as const),
    isLoading: apiQuery.isLoading || (apiQuery.isError && localQuery.isLoading),
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
    getNextPageParam: (lastPage) => {
      const { page, pageSize, total } = lastPage.data;
      return page * pageSize < total ? page + 1 : undefined;
    },
  });
}

// The source isn't part of the key: it only tells the backend where the
// open came from, and the recipe is the same wherever it was opened.
function useRecipeDetailQuery(recipeId?: string, source?: string) {
  const db = useSQLiteContext();

  return useQuery({
    queryKey: queryKeys.recipes.detail(recipeId ?? ""),
    queryFn: async () => {
      const recipe = await recipesApi.getRecipeById(recipeId ?? "", source);

      void cacheRecipeDetail(db, recipe).catch((error) => {
        console.error("Failed to cache recipe detail locally", error);
      });

      return recipe;
    },
    enabled: Boolean(recipeId),
  });
}

export function useRecipeDetailWithLocalFallback(recipeId?: string, source?: string) {
  const db = useSQLiteContext();
  const apiQuery = useRecipeDetailQuery(recipeId, source);
  const localQuery = useQuery({
    queryKey: queryKeys.recipes.localFallbackDetail(recipeId ?? ""),
    queryFn: () => getLocalRecipeById(db, recipeId ?? ""),
    enabled: Boolean(recipeId),
  });

  const data = apiQuery.data ?? localQuery.data ?? undefined;
  const usingLocalFallback = !apiQuery.data && Boolean(localQuery.data);

  return {
    ...apiQuery,
    data,
    source: usingLocalFallback ? ("local" as const) : ("api" as const),
    isLoading: !data && apiQuery.isLoading,
    isError: apiQuery.isError && !localQuery.isLoading && !localQuery.data,
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

