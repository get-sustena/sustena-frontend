import { useQuery } from "@tanstack/react-query";
import { useSQLiteContext } from "expo-sqlite";
import {
  getLocalRecipeById,
  getLocalRecipes,
} from "../../db/recipeRepository";
import { recipesApi } from "../../lib/api";
import { queryKeys } from "../../lib/query/queryKeys";
import { RecipeSearchParams } from "../../types/api";

export function useRecipesQuery(params?: RecipeSearchParams) {
  return useQuery({
    queryKey: queryKeys.recipes.list(params),
    queryFn: () => recipesApi.getRecipes(params),
  });
}

export function useRecipesWithLocalFallback(params?: RecipeSearchParams) {
  const db = useSQLiteContext();
  const apiQuery = useRecipesQuery(params);
  const localQuery = useQuery({
    queryKey: ["recipes", "local-fallback", params ?? {}] as const,
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

export function useRecipeDetailQuery(recipeId?: string) {
  return useQuery({
    queryKey: queryKeys.recipes.detail(recipeId ?? ""),
    queryFn: () => recipesApi.getRecipeById(recipeId ?? ""),
    enabled: Boolean(recipeId),
  });
}

export function useRecipeDetailWithLocalFallback(recipeId?: string) {
  const db = useSQLiteContext();
  const apiQuery = useRecipeDetailQuery(recipeId);
  const localQuery = useQuery({
    queryKey: ["recipes", "local-fallback-detail", recipeId ?? ""] as const,
    queryFn: () => getLocalRecipeById(db, recipeId ?? ""),
    enabled: Boolean(recipeId) && apiQuery.isError,
  });

  const data = apiQuery.data ?? localQuery.data ?? undefined;
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

export function useRecipeSlugQuery(slug?: string) {
  return useQuery({
    queryKey: queryKeys.recipes.slug(slug ?? ""),
    queryFn: () => recipesApi.getRecipeBySlug(slug ?? ""),
    enabled: Boolean(slug),
  });
}

export function useRecipeTagsQuery() {
  return useQuery({
    queryKey: queryKeys.recipes.tags,
    queryFn: recipesApi.getRecipeTags,
  });
}
