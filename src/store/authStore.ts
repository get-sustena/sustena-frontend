// src/store/authStore.ts

import { create } from "zustand";
import { User } from "../types/api";

type AuthState = {
  user: User | null;
  isHydratingAuth: boolean;
  isAuthenticated: boolean;
  isSigningOut: boolean;

  setUser: (user: User | null) => void;
  setIsHydratingAuth: (value: boolean) => void;
  setAuthenticatedOffline: () => void;
  beginSignOut: () => void;
  clearAuth: () => void;
};

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isHydratingAuth: true,
  isAuthenticated: false,
  isSigningOut: false,

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

  // Tokens exist locally but we couldn't reach the server to verify them
  // (cold start, timeout, offline). Treat the session as valid rather than
  // forcing a sign-out — a stale/invalid token will still surface as a real
  // 401 the next time an authenticated request is made.
  setAuthenticatedOffline: () => {
    set({
      isAuthenticated: true,
    });
  },

  beginSignOut: () => {
    set({ isSigningOut: true });
  },

  clearAuth: () => {
    set({
      user: null,
      isAuthenticated: false,
      isSigningOut: false,
    });
  },
}));
