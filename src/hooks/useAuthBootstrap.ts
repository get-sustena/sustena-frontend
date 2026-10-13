
import { useEffect } from "react";
import { useSQLiteContext } from "expo-sqlite";
import {
  clearLocalAccountData,
  getLocalAccountDataOwner,
  prepareLocalAccountData,
} from "../db/accountDataRepository";
import {
  hydrateLocalAccountStores,
  resetLocalAccountStores,
} from "../lib/accountSession";
import { getMe } from "../lib/api/auth";
import { isApiClientError } from "../lib/api/errors";
import { clearAuthTokens, getStoredAuthTokens } from "../lib/api/tokenStorage";
import { useAuthStore } from "../store/authStore";

// After a failed /auth/me the session carries on offline; these are the
// waits before asking again, and the last one repeats until it answers.
const USER_RETRY_DELAYS_MS = [2_000, 5_000, 15_000, 30_000];

export function useAuthBootstrap() {
  const db = useSQLiteContext();
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
          await clearLocalAccountData(db);
          resetLocalAccountStores();

          if (isMounted) {
            setUser(null);
          }

          return;
        }

        try {
          const user = await getMe();

          if (await prepareLocalAccountData(db, user.id)) {
            await hydrateLocalAccountStores(db);
          }

          if (isMounted) {
            setUser(user);
          }
        } catch (error) {
          // Only a confirmed 401 invalidates restored tokens.
          if (isApiClientError(error) && error.status === 401) {
            await clearAuthTokens();
            await clearLocalAccountData(db);
            resetLocalAccountStores();

            if (isMounted) {
              setUser(null);
            }
          } else if (isMounted) {
            if (!(await getLocalAccountDataOwner(db))) {
              await clearLocalAccountData(db);
              resetLocalAccountStores();
            }
            setAuthenticatedOffline();
            void retryLoadingUser();
          }
        }
      } finally {
        if (isMounted) {
          setIsHydratingAuth(false);
        }
      }
    }

    // A dropped connection at start-up would otherwise leave the whole
    // session without the user, so Home greets nobody by name. Keep asking
    // until /auth/me answers, the user signs out, or a 401 ends the session.
    async function retryLoadingUser() {
      for (let attempt = 0; ; attempt += 1) {
        const delay =
          USER_RETRY_DELAYS_MS[Math.min(attempt, USER_RETRY_DELAYS_MS.length - 1)];
        await new Promise((resolve) => setTimeout(resolve, delay));

        const { user, isAuthenticated } = useAuthStore.getState();
        if (!isMounted || user || !isAuthenticated) return;

        try {
          const loadedUser = await getMe();

          if (await prepareLocalAccountData(db, loadedUser.id)) {
            await hydrateLocalAccountStores(db);
          }

          if (isMounted) {
            setUser(loadedUser);
          }
          return;
        } catch (error) {
          if (isApiClientError(error) && error.status === 401) return;
        }
      }
    }

    bootstrapAuth();

    return () => {
      isMounted = false;
    };
  }, [db, setUser, setIsHydratingAuth, setAuthenticatedOffline]);
}
