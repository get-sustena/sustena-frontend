import { useQuery } from "@tanstack/react-query";
import { useSQLiteContext } from "expo-sqlite";
import { getLocalRecipes } from "../../db/recipeRepository";
import { recommendationsApi } from "../../lib/api";
import { isRecipeForMealTime, type MealTime } from "../../lib/mealTime";
import { queryKeys } from "../../lib/query/queryKeys";
import type { RecommendationListResponse } from "../../types/api";
import { useStartLoading } from "./useStartLoading";

const RECOMMENDATION_COUNT = 12;
const LOCAL_CATALOGUE_SIZE = 500;

export function useHomeRecommendations(mealTime: MealTime) {
  const db = useSQLiteContext();
  const startLoading = useStartLoading();
  const apiQuery = useQuery({
    queryKey: queryKeys.recommendations.homeForMeal(mealTime),
    queryFn: () =>
      recommendationsApi.getRecommendations(RECOMMENDATION_COUNT, mealTime),
    enabled: !startLoading,
  });
  const localQuery = useQuery({
    queryKey: queryKeys.recommendations.localFallback(mealTime),
    queryFn: async (): Promise<RecommendationListResponse> => {
      const catalogue = await getLocalRecipes(db, {
        page: 1,
        pageSize: LOCAL_CATALOGUE_SIZE,
      });
      const forMeal = catalogue.items.filter((recipe) =>
        isRecipeForMealTime(recipe, mealTime)
      );
      // Like the API, show the usual list when nothing fits the meal.
      const recipes = (forMeal.length > 0 ? forMeal : catalogue.items).slice(
        0,
        RECOMMENDATION_COUNT
      );
      return {
        items: recipes.map((recipe) => ({
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
    isLoading:
      (startLoading && !data) ||
      apiQuery.isLoading ||
      (apiQuery.isError && localQuery.isLoading),
    isError: apiQuery.isError && localQuery.isError,
    error: localQuery.error ?? apiQuery.error,
    refetch: apiQuery.refetch,
  };
}
