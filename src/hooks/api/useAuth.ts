import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { authApi } from "../../lib/api";
import { queryKeys } from "../../lib/query/queryKeys";
import { useAuthStore } from "../../store/authStore";

export function useMeQuery() {
  return useQuery({
    queryKey: queryKeys.auth.me,
    queryFn: authApi.getMe,
  });
}

export function useSignupMutation() {
  const queryClient = useQueryClient();
  const setUser = useAuthStore((state) => state.setUser);

  return useMutation({
    mutationFn: authApi.signup,
    onSuccess: async (response) => {
      setUser(response.user);
      queryClient.setQueryData(queryKeys.auth.me, response.user);
      await queryClient.invalidateQueries({ queryKey: queryKeys.auth.me });
    },
  });
}

export function useLoginMutation() {
  const queryClient = useQueryClient();
  const setUser = useAuthStore((state) => state.setUser);

  return useMutation({
    mutationFn: authApi.login,
    onSuccess: async (response) => {
      setUser(response.user);
      queryClient.setQueryData(queryKeys.auth.me, response.user);
      await queryClient.invalidateQueries({ queryKey: queryKeys.auth.me });
    },
  });
}

export function useLogoutMutation() {
  const queryClient = useQueryClient();
  const clearAuth = useAuthStore((state) => state.clearAuth);

  return useMutation({
    mutationFn: authApi.logout,
    onSettled: async () => {
      clearAuth();
      await queryClient.clear();
    },
  });
}

export function useLogoutAllMutation() {
  const queryClient = useQueryClient();
  const clearAuth = useAuthStore((state) => state.clearAuth);

  return useMutation({
    mutationFn: authApi.logoutAll,
    onSettled: async () => {
      clearAuth();
      await queryClient.clear();
    },
  });
}
