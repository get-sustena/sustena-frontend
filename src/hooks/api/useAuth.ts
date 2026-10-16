import { QueryClient, useMutation, useQueryClient } from "@tanstack/react-query";
import { SQLiteDatabase, useSQLiteContext } from "expo-sqlite";
import {
  clearLocalAccountData,
  forgetLocalAccountData,
  getLocalAccountDataOwner,
  prepareLocalAccountData,
} from "../../db/accountDataRepository";
import { clearAuthTokens } from "../../lib/api/tokenStorage";
import {
  hydrateLocalAccountStores,
  resetLocalAccountStores,
} from "../../lib/accountSession";
import { startAppOpen } from "../../lib/activity/appActivity";
import { authApi } from "../../lib/api";
import { waitForAccountBackgroundTasks } from "../../lib/accountBackgroundTasks";
import { disableMealReminders, forgetMealReminders } from "../../lib/notifications/mealReminders";
import { queryKeys } from "../../lib/query/queryKeys";
import { useAuthStore } from "../../store/authStore";

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

// The agreement screen: the saved user no longer needs it.
export function useAgreeToTermsMutation() {
  const queryClient = useQueryClient();
  const setUser = useAuthStore((state) => state.setUser);
  return useMutation({
    mutationFn: authApi.agreeToTerms,
    // A refusal (age, ticks, already saved) won't change on a second try.
    retry: false,
    onSuccess: (user) => {
      setUser(user);
      queryClient.setQueryData(queryKeys.auth.me, user);
    },
  });
}

// The email code screen. Neither is resent on its own: a code is checked
// once, and a second send would replace the code just emailed.
export function useSendEmailCodeMutation() {
  return useMutation({ mutationFn: authApi.sendEmailCode, retry: false });
}

export function useVerifyEmailCodeMutation() {
  const queryClient = useQueryClient();
  const setUser = useAuthStore((state) => state.setUser);
  return useMutation({
    mutationFn: authApi.verifyEmailCode,
    retry: false,
    onSuccess: (user) => {
      setUser(user);
      queryClient.setQueryData(queryKeys.auth.me, user);
    },
  });
}

// Delete account. The server deletes everything and signs out every device,
// so nothing more is asked of it; this phone then forgets the account too,
// with nothing kept for a return.
export function useDeleteAccountMutation() {
  const db = useSQLiteContext();
  const queryClient = useQueryClient();
  const clearAuth = useAuthStore((state) => state.clearAuth);
  const beginSignOut = useAuthStore((state) => state.beginSignOut);

  return useMutation({
    mutationFn: authApi.deleteMe,
    // Sent once: a wrong password isn't resent, and a delete is never repeated.
    retry: false,
    // The account is gone by now, so a step failing here mustn't stop the
    // sign-out or show the person an error.
    onSuccess: async () => {
      beginSignOut();
      try {
        const userId = useAuthStore.getState().user?.id ?? (await getLocalAccountDataOwner(db));
        await queryClient.cancelQueries();
        await waitForAccountBackgroundTasks();
        await clearAuthTokens();
        await forgetMealReminders(db);
        if (userId) await forgetLocalAccountData(db, userId);
        else await clearLocalAccountData(db);
      } catch (error) {
        console.warn("Failed to forget the deleted account on this device", error);
      } finally {
        clearAuth();
        queryClient.clear();
        resetLocalAccountStores();
      }
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
      // The tokens are stored by now, so the new session's first event goes to this account.
      void startAppOpen(db);
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
      // The tokens are stored by now, so the new session's first event goes to this account.
      void startAppOpen(db);
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
      // While still signed in, so this phone stops getting the account's reminders.
      await disableMealReminders(db);
      return authApi.logout();
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
    // Cleanup must finish before unmounting persistence effects to avoid a SQLite worker race.
    await clearLocalAccountData(db);
  } catch (error) {
    // A local SQLite cleanup failure must not block an otherwise complete sign-out.
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
