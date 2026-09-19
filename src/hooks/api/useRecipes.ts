import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { useSQLiteContext } from "expo-sqlite";
import {
  cacheRecipeDetail,
  getLocalRecipeById,
  getLocalRecipes,
} from "../../db/recipeRepository";
import { recipesApi } from "../../lib/api";
import { queryKeys } from "../../lib/query/queryKeys";
import type { RecipeDetail, RecipeSearchParams } from "../../types/api";

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

export function useInfiniteRecipesWithLocalFallback(
  params: Omit<RecipeSearchParams, "page"> = {}
) {
  const db = useSQLiteContext();

  return useInfiniteQuery({
    queryKey: ["recipes", "infinite-list", params] as const,
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

export function useRecipeDetailQuery(recipeId?: string) {
  const db = useSQLiteContext();

  return useQuery({
    queryKey: queryKeys.recipes.detail(recipeId ?? ""),
    queryFn: async () => {
      const recipe = await recipesApi.getRecipeById(recipeId ?? "");

      void cacheRecipeDetail(db, recipe).catch((error) => {
        console.error("Failed to cache recipe detail locally", error);
      });

      return recipe;
    },
    enabled: Boolean(recipeId),
  });
}

export function useRecipeDetailWithLocalFallback(recipeId?: string) {
  const db = useSQLiteContext();
  const apiQuery = useRecipeDetailQuery(recipeId);
  const localQuery = useQuery({
    queryKey: ["recipes", "local-fallback-detail", recipeId ?? ""] as const,
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

export function useRateRecipeMutation(recipeId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (rating: number) => recipesApi.rateRecipe(recipeId, rating),
    onSuccess: (result) => {
      queryClient.setQueryData<RecipeDetail>(
        queryKeys.recipes.detail(recipeId),
        (current) =>
          current
            ? {
                ...current,
                currentUserRating: result.rating,
                averageRating: result.averageRating,
                ratingCount: result.ratingCount,
              }
            : current
      );
      queryClient.invalidateQueries({
        predicate: (query) =>
          query.queryKey[0] === "recipes" && query.queryKey[1] === "list",
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.creators.all });
    },
  });
}

export function useRemoveRecipeRatingMutation(recipeId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => recipesApi.removeRecipeRating(recipeId),
    onSuccess: (result) => {
      queryClient.setQueryData<RecipeDetail>(
        queryKeys.recipes.detail(recipeId),
        (current) =>
          current
            ? {
                ...current,
                currentUserRating: null,
                averageRating: result.averageRating,
                ratingCount: result.ratingCount,
              }
            : current
      );
      queryClient.invalidateQueries({
        predicate: (query) =>
          query.queryKey[0] === "recipes" && query.queryKey[1] === "list",
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.creators.all });
    },
  });
}
