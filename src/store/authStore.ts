// src/store/authStore.ts

import { create } from "zustand";
import { User } from "../types/api";

type AuthState = {
  user: User | null;
  isHydratingAuth: boolean;
  isAuthenticated: boolean;

  setUser: (user: User | null) => void;
  setIsHydratingAuth: (value: boolean) => void;
  clearAuth: () => void;
};

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isHydratingAuth: true,
  isAuthenticated: false,

  setUser: (user) => {
    set({
      user,
      isAuthenticated: Boolean(user),
    });
  },

  setIsHydratingAuth: (value) => {
    set({
      isHydratingAuth: value,
    });
  },

  clearAuth: () => {
    set({
      user: null,
      isAuthenticated: false,
    });
  },
}));
