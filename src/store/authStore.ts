
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

  // Only a confirmed 401 should invalidate a locally restored session.
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
