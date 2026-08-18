// src/hooks/useAuthBootstrap.ts

import { useEffect } from "react";
import { getMe } from "../lib/api/auth";
import { isApiClientError } from "../lib/api/errors";
import { clearAuthTokens, getStoredAuthTokens } from "../lib/api/tokenStorage";
import { useAuthStore } from "../store/authStore";

export function useAuthBootstrap() {
  const setUser = useAuthStore((state) => state.setUser);
  const setIsHydratingAuth = useAuthStore((state) => state.setIsHydratingAuth);
  const setAuthenticatedOffline = useAuthStore(
    (state) => state.setAuthenticatedOffline
  );

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

        try {
          const user = await getMe();

          if (isMounted) {
            setUser(user);
          }
        } catch (error) {
          // Only a genuine 401 means the tokens are actually invalid.
          // Network, timeout, and 5xx errors must not sign the user out. Keep
          // the tokens and let the app work offline until a real authenticated
          // request confirms the session is gone.
          if (isApiClientError(error) && error.status === 401) {
            await clearAuthTokens();

            if (isMounted) {
              setUser(null);
            }
          } else if (isMounted) {
            setAuthenticatedOffline();
          }
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
  }, [setUser, setIsHydratingAuth, setAuthenticatedOffline]);
}
