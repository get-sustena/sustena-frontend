import { QueryClient, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { SQLiteDatabase, useSQLiteContext } from "expo-sqlite";
import {
  clearLocalAccountData,
  prepareLocalAccountData,
} from "../../db/accountDataRepository";
import {
  hydrateLocalAccountStores,
  resetLocalAccountStores,
} from "../../lib/accountSession";
import { authApi } from "../../lib/api";
import { waitForAccountBackgroundTasks } from "../../lib/accountBackgroundTasks";
import { queryKeys } from "../../lib/query/queryKeys";
import { useAuthStore } from "../../store/authStore";

export function useMeQuery() {
  return useQuery({
    queryKey: queryKeys.auth.me,
    queryFn: authApi.getMe,
  });
}

export function useUpdateMeMutation() {
  const queryClient = useQueryClient();
  const setUser = useAuthStore((state) => state.setUser);
  return useMutation({
    mutationFn: authApi.updateMe,
    onSuccess: (user) => {
      setUser(user);
      queryClient.setQueryData(queryKeys.auth.me, user);
    },
  });
}

export function useChangePasswordMutation() {
  return useMutation({ mutationFn: authApi.changePassword });
}

export function useSignupMutation() {
  const db = useSQLiteContext();
  const queryClient = useQueryClient();
  const setUser = useAuthStore((state) => state.setUser);

  return useMutation({
    mutationFn: authApi.signup,
    onSuccess: async (response) => {
      await prepareLocalAccountData(db, response.user.id);
      await hydrateLocalAccountStores(db);
      queryClient.clear();
      setUser(response.user);
      queryClient.setQueryData(queryKeys.auth.me, response.user);
      await queryClient.invalidateQueries({ queryKey: queryKeys.auth.me });
    },
  });
}

export function useLoginMutation() {
  const db = useSQLiteContext();
  const queryClient = useQueryClient();
  const setUser = useAuthStore((state) => state.setUser);

  return useMutation({
    mutationFn: authApi.login,
    onSuccess: async (response) => {
      await prepareLocalAccountData(db, response.user.id);
      await hydrateLocalAccountStores(db);
      queryClient.clear();
      setUser(response.user);
      queryClient.setQueryData(queryKeys.auth.me, response.user);
      await queryClient.invalidateQueries({ queryKey: queryKeys.auth.me });
    },
  });
}

export function useLogoutMutation() {
  const db = useSQLiteContext();
  const queryClient = useQueryClient();
  const clearAuth = useAuthStore((state) => state.clearAuth);
  const beginSignOut = useAuthStore((state) => state.beginSignOut);

  return useMutation({
    mutationFn: async () => {
      beginSignOut();
      await queryClient.cancelQueries();
      await waitForAccountBackgroundTasks();
      return authApi.logout();
    },
    onSettled: () => finalizeLocalLogout(db, queryClient, clearAuth),
  });
}

export function useLogoutAllMutation() {
  const db = useSQLiteContext();
  const queryClient = useQueryClient();
  const clearAuth = useAuthStore((state) => state.clearAuth);
  const beginSignOut = useAuthStore((state) => state.beginSignOut);

  return useMutation({
    mutationFn: async () => {
      beginSignOut();
      await queryClient.cancelQueries();
      await waitForAccountBackgroundTasks();
      return authApi.logoutAll();
    },
    onSettled: () => finalizeLocalLogout(db, queryClient, clearAuth),
  });
}

async function finalizeLocalLogout(
  db: SQLiteDatabase,
  queryClient: QueryClient,
  clearAuth: () => void
) {
  try {
    // Keep persistence effects mounted until the account snapshot and cleanup
    // finish. Unmounting them first can race Expo SQLite's web worker.
    await clearLocalAccountData(db);
  } catch (error) {
    // Server logout and token removal have already completed. A browser-local
    // SQLite failure must not leave the user on an uncaught error screen.
    console.warn("Failed to clear local account data during logout", error);
  } finally {
    clearAuth();
    queryClient.clear();
    resetLocalAccountStores();
  }
}

export function useForgotPasswordMutation() {
  return useMutation({
    mutationFn: authApi.forgotPassword,
  });
}

export function useVerifyResetCodeMutation() {
  return useMutation({
    mutationFn: authApi.verifyResetCode,
  });
}

export function useResetPasswordMutation() {
  return useMutation({
    mutationFn: authApi.resetPassword,
  });
}
