// src/hooks/useAuthBootstrap.ts

import { useEffect } from "react";
import { getMe } from "../lib/api/auth";
import { clearAuthTokens, getStoredAuthTokens } from "../lib/api/tokenStorage";
import { useAuthStore } from "../store/authStore";

export function useAuthBootstrap() {
  const setUser = useAuthStore((state) => state.setUser);
  const setIsHydratingAuth = useAuthStore((state) => state.setIsHydratingAuth);

  useEffect(() => {
    let isMounted = true;

    async function bootstrapAuth() {
      try {
        const tokens = await getStoredAuthTokens();

        if (!tokens) {
          if (isMounted) {
            setUser(null);
          }

          return;
        }

        const user = await getMe();

        if (isMounted) {
          setUser(user);
        }
      } catch {
        await clearAuthTokens();

        if (isMounted) {
          setUser(null);
        }
      } finally {
        if (isMounted) {
          setIsHydratingAuth(false);
        }
      }
    }

    bootstrapAuth();

    return () => {
      isMounted = false;
    };
  }, [setUser, setIsHydratingAuth]);
}
