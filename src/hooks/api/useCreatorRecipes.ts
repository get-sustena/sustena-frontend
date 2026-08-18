import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { creatorRecipesApi } from "../../lib/api";
import { queryKeys } from "../../lib/query/queryKeys";
import {
  MyRecipeListParams,
  RecipeDraftCreateRequest,
  RecipeDraftWriteRequest,
} from "../../types/api";

export function useMyRecipesQuery(params?: MyRecipeListParams, enabled = true) {
  return useQuery({
    queryKey: queryKeys.creatorRecipes.list(params),
    queryFn: () => creatorRecipesApi.getMyRecipes(params),
    enabled,
  });
}

export function useMyRecipeQuery(recipeId?: string) {
  return useQuery({
    queryKey: queryKeys.creatorRecipes.detail(recipeId ?? ""),
    queryFn: () => creatorRecipesApi.getMyRecipe(recipeId ?? ""),
    enabled: Boolean(recipeId),
  });
}

export function useAuthoringVocabularyQuery() {
  return useQuery({
    queryKey: queryKeys.creatorRecipes.vocabulary,
    queryFn: creatorRecipesApi.getAuthoringVocabulary,
    staleTime: 24 * 60 * 60 * 1000,
  });
}

export function useCreateRecipeDraftMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: RecipeDraftCreateRequest) =>
      creatorRecipesApi.createRecipeDraft(payload),
    onSuccess: (recipe) => {
      queryClient.setQueryData(
        queryKeys.creatorRecipes.detail(recipe.id),
        recipe
      );
      invalidateRecipeLibraries(queryClient);
    },
  });
}

export function useUpdateRecipeDraftMutation(
  recipeId: string,
  options: { invalidateLibraries?: boolean } = {}
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: RecipeDraftWriteRequest) =>
      creatorRecipesApi.updateRecipeDraft(recipeId, payload),
    onSuccess: (recipe) => {
      queryClient.setQueryData(
        queryKeys.creatorRecipes.detail(recipe.id),
        recipe
      );
      if (options.invalidateLibraries ?? true) {
        invalidateRecipeLibraries(queryClient);
      }
    },
  });
}

export function useDuplicateRecipeMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: creatorRecipesApi.duplicateRecipe,
    onSuccess: (recipe) => {
      queryClient.setQueryData(
        queryKeys.creatorRecipes.detail(recipe.id),
        recipe
      );
      invalidateRecipeLibraries(queryClient);
    },
  });
}

export function useCreateRecipeEditDraftMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: creatorRecipesApi.createRecipeEditDraft,
    onSuccess: (recipe) => {
      queryClient.setQueryData(
        queryKeys.creatorRecipes.detail(recipe.id),
        recipe
      );
      invalidateRecipeLibraries(queryClient);
    },
  });
}

export function usePublishRecipeMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ recipeId, revision }: { recipeId: string; revision: number }) =>
      creatorRecipesApi.publishRecipe(recipeId, revision),
    onSuccess: (recipe) => {
      queryClient.setQueryData(
        queryKeys.creatorRecipes.detail(recipe.id),
        recipe
      );
      invalidateRecipeLibraries(queryClient);
    },
  });
}

export function useUnpublishRecipeMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ recipeId, revision }: { recipeId: string; revision: number }) =>
      creatorRecipesApi.unpublishRecipe(recipeId, revision),
    onSuccess: (recipe) => {
      queryClient.setQueryData(
        queryKeys.creatorRecipes.detail(recipe.id),
        recipe
      );
      invalidateRecipeLibraries(queryClient);
    },
  });
}

export function useDeleteRecipeMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ recipeId, revision }: { recipeId: string; revision: number }) =>
      creatorRecipesApi.deleteRecipe(recipeId, revision),
    onSuccess: () => {
      invalidateRecipeLibraries(queryClient);
    },
  });
}

function invalidateRecipeLibraries(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: queryKeys.creatorRecipes.all });
  queryClient.invalidateQueries({ queryKey: queryKeys.creators.all });
  queryClient.invalidateQueries({ queryKey: queryKeys.recipes.all });
}
