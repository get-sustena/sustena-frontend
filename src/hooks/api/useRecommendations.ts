import { useQuery } from "@tanstack/react-query";
import { useSQLiteContext } from "expo-sqlite";
import { getLocalRecipes } from "../../db/recipeRows";
import { recommendationsApi } from "../../lib/api";
import { getSavedMealPicks, withTodaysPickFirst } from "../../lib/catalogue/mealPicks";
import { isRecipeForMealTime, type MealTime } from "../../lib/mealTime";
import { queryKeys } from "../../lib/query/queryKeys";
import { useAuthStore } from "../../store/authStore";
import type { RecommendationListResponse } from "../../types/api";
import { useStartLoading } from "./useStartLoading";

const RECOMMENDATION_COUNT = 12;
const LOCAL_CATALOGUE_SIZE = 500;

export function useHomeRecommendations(mealTime: MealTime) {
  const db = useSQLiteContext();
  const userId = useAuthStore((state) => state.user?.id);
  const startLoading = useStartLoading();
  const apiQuery = useQuery({
    queryKey: queryKeys.recommendations.homeForMeal(mealTime),
    queryFn: () =>
      recommendationsApi.getRecommendations(RECOMMENDATION_COUNT, mealTime),
    enabled: !startLoading,
  });
  // Offline the request waits ("paused") rather than failing; the recipes
  // on the phone show meanwhile, led by today's saved pick (OFF-01). They're
  // read from SQLite, so this query runs with or without a connection.
  const showSavedRecipes = !apiQuery.data && (apiQuery.isError || apiQuery.isPaused);
  const localQuery = useQuery({
    queryKey: queryKeys.recommendations.localFallback(mealTime),
    queryFn: async (): Promise<RecommendationListResponse> => {
      const [catalogue, picks] = await Promise.all([
        getLocalRecipes(db, { page: 1, pageSize: LOCAL_CATALOGUE_SIZE }),
        userId ? getSavedMealPicks(db, userId) : null,
      ]);
      const forMeal = catalogue.items.filter((recipe) =>
        isRecipeForMealTime(recipe, mealTime)
      );
      // Like the API, show the usual list when nothing fits the meal.
      const recipes = withTodaysPickFirst(
        forMeal.length > 0 ? forMeal : catalogue.items,
        picks,
        mealTime,
        new Date()
      ).slice(0, RECOMMENDATION_COUNT);
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
    enabled: showSavedRecipes,
    networkMode: "always",
  });

  const data = apiQuery.data ?? localQuery.data;
  return {
    ...apiQuery,
    data,
    isLoading:
      (startLoading && !data) ||
      apiQuery.isLoading ||
      (showSavedRecipes && localQuery.isLoading),
    isError: apiQuery.isError && localQuery.isError,
    error: localQuery.error ?? apiQuery.error,
    refetch: apiQuery.refetch,
  };
}
