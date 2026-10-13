import {
  QueryClient,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { favoritesApi } from "../../lib/api";
import { queryKeys } from "../../lib/query/queryKeys";

export function useFavoritesQuery() {
  return useQuery({
    queryKey: queryKeys.favorites.all,
    queryFn: favoritesApi.getFavorites,
  });
}

export function useAddFavoriteMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: favoritesApi.addFavorite,
    onSuccess: invalidateFavoriteBackedQueries(queryClient),
  });
}

export function useRemoveFavoriteMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: favoritesApi.removeFavorite,
    onSuccess: invalidateFavoriteBackedQueries(queryClient),
  });
}

function invalidateFavoriteBackedQueries(queryClient: QueryClient) {
  return async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.favorites.all }),
      queryClient.invalidateQueries({
        predicate: (query) =>
          query.queryKey[0] === "recipes" && query.queryKey[1] === "list",
      }),
    ]);
  };
}
