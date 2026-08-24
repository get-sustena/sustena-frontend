// src/store/favoritesStore.ts

import { create } from "zustand";
import { FavoriteRecipe } from "../types/favorite";

type FavoritesState = {
  favorites: FavoriteRecipe[];

  hydrateFavorites: (favorites: FavoriteRecipe[]) => void;
  addFavorite: (recipeId: string) => void;
  removeFavorite: (recipeId: string) => void;
  toggleFavorite: (recipeId: string) => boolean;

  isFavorite: (recipeId: string) => boolean;
  favoriteCount: () => number;
};

export const useFavoritesStore = create<FavoritesState>((set, get) => ({
  favorites: [],

  hydrateFavorites: (favorites) => {
    set({
      favorites,
    });
  },

  addFavorite: (recipeId) => {
    const current = get().favorites;

    if (current.some((favorite) => favorite.recipeId === recipeId)) {
      return;
    }

    const now = new Date().toISOString();

    set({
      favorites: [
        {
          recipeId,
          createdAt: now,
          updatedAt: now,
        },
        ...current,
      ],
    });
  },

  removeFavorite: (recipeId) => {
    set((state) => ({
      favorites: state.favorites.filter(
        (favorite) => favorite.recipeId !== recipeId
      ),
    }));
  },

  toggleFavorite: (recipeId) => {
    const alreadyFavorite = get().isFavorite(recipeId);

    if (alreadyFavorite) {
      get().removeFavorite(recipeId);
      return false;
    }

    get().addFavorite(recipeId);
    return true;
  },

  isFavorite: (recipeId) => {
    return get().favorites.some((favorite) => favorite.recipeId === recipeId);
  },

  favoriteCount: () => {
    return get().favorites.length;
  },
}));
