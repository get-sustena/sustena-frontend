import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSQLiteContext } from "expo-sqlite";
import {
  clearLocalAccountData,
  prepareLocalAccountData,
} from "../../db/accountDataRepository";
import {
  hydrateLocalAccountStores,
  resetLocalAccountStores,
} from "../../lib/accountSession";
import { authApi } from "../../lib/api";
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

  return useMutation({
    mutationFn: authApi.logout,
    onSettled: async () => {
      clearAuth();
      queryClient.clear();
      await clearLocalAccountData(db);
      resetLocalAccountStores();
    },
  });
}

export function useLogoutAllMutation() {
  const db = useSQLiteContext();
  const queryClient = useQueryClient();
  const clearAuth = useAuthStore((state) => state.clearAuth);

  return useMutation({
    mutationFn: authApi.logoutAll,
    onSettled: async () => {
      clearAuth();
      queryClient.clear();
      await clearLocalAccountData(db);
      resetLocalAccountStores();
    },
  });
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
