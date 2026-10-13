import { useQuery } from "@tanstack/react-query";
import { useSQLiteContext } from "expo-sqlite";
import { getLocalRecipes } from "../../db/recipeRepository";
import { recommendationsApi } from "../../lib/api";
import { queryKeys } from "../../lib/query/queryKeys";
import type { RecommendationListResponse } from "../../types/api";

export function useHomeRecommendations() {
  const db = useSQLiteContext();
  const apiQuery = useQuery({
    queryKey: queryKeys.recommendations.home,
    queryFn: () => recommendationsApi.getRecommendations(12),
  });
  const localQuery = useQuery({
    queryKey: queryKeys.recommendations.localFallback,
    queryFn: async (): Promise<RecommendationListResponse> => {
      const recipes = await getLocalRecipes(db, { page: 1, pageSize: 12 });
      return {
        items: recipes.items.map((recipe) => ({
          recipe,
          score: 0,
          pantryMatchPercentage: 0,
          matchedPantryIngredientCount: 0,
          reasons: [],
        })),
        pantryIngredientCount: 0,
        personalized: false,
      };
    },
    enabled: apiQuery.isError,
  });

  const data = apiQuery.data ?? localQuery.data;
  return {
    ...apiQuery,
    data,
    isLoading: apiQuery.isLoading || (apiQuery.isError && localQuery.isLoading),
    isError: apiQuery.isError && localQuery.isError,
    error: localQuery.error ?? apiQuery.error,
    refetch: apiQuery.refetch,
  };
}
