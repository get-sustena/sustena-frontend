import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSQLiteContext } from "expo-sqlite";
import { useEffect } from "react";
import { AppState } from "react-native";
import { clearEmailReminder, getEmailReminder, saveEmailReminder } from "../db/homeRemindersRepository";
import { authApi } from "../lib/api";
import { getApiErrorMessage } from "../lib/api/errors";
import { getLagosDay } from "../lib/lagosDay";
import { queryKeys } from "../lib/query/queryKeys";
import { linkStillWorks } from "../lib/reminders/homeReminders";
import { useAuthStore } from "../store/authStore";
import { showToast } from "../store/uiStore";

// The "Confirm your email" reminder (v6.9), shared by the Home card and the
// Settings row. It never blocks anything.
export function useEmailReminder() {
  const db = useSQLiteContext();
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);
  const userId = user?.id ?? "";
  const record = useQuery({
    queryKey: queryKeys.reminders.email(userId),
    queryFn: () => getEmailReminder(db, userId),
    enabled: Boolean(userId),
    networkMode: "always",
  });
  const resend = useMutation({ mutationFn: authApi.resendConfirmationEmail, retry: false });
  const refreshUser = useRefreshUser();

  const sentOn = record.data?.sentOn ?? null;
  const today = getLagosDay();

  async function resendEmail() {
    if (!user || resend.isPending) return;
    try {
      const result = await resend.mutateAsync();
      if (result.alreadyVerified) {
        // The card goes, and the confirmed toast follows (useEmailConfirmedNotice).
        await refreshUser({ ...user, emailVerifiedAt: user.emailVerifiedAt ?? new Date().toISOString() });
        return;
      }
      await saveEmailReminder(db, user.id, getLagosDay());
      await queryClient.invalidateQueries({ queryKey: queryKeys.reminders.email(user.id) });
      showToast(`Email sent to ${user.email}`, "success");
    } catch (error) {
      showToast(getApiErrorMessage(error), "danger");
    }
  }

  return {
    // Unknown while the account isn't loaded (an offline start): hidden.
    show: Boolean(user && !user.emailVerifiedAt),
    email: user?.email ?? "",
    // Once the link has expired, the card asks to resend again.
    sentOn: sentOn && linkStillWorks(sentOn, today) ? sentOn : null,
    resend: () => void resendEmail(),
    isResending: resend.isPending,
  };
}

// Asks /auth/me again; when that fails, `fallback` (what the app already knows)
// is kept.
function useRefreshUser() {
  const queryClient = useQueryClient();
  const setUser = useAuthStore((state) => state.setUser);
  return async (fallback?: Parameters<typeof setUser>[0]) => {
    try {
      const user = await authApi.getMe();
      setUser(user);
      queryClient.setQueryData(queryKeys.auth.me, user);
    } catch {
      if (fallback) setUser(fallback);
    }
  };
}

// Mounted once (Home). Remembers on this phone that the email shows as not
// confirmed, and says "Your email is confirmed" when the app learns it is:
// the person confirms in their email app, so /auth/me is asked again each
// time the app comes back to the front.
export function useEmailConfirmedNotice() {
  const db = useSQLiteContext();
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);
  const refreshUser = useRefreshUser();
  const userId = user?.id ?? "";
  const confirmed = Boolean(user?.emailVerifiedAt);
  const record = useQuery({
    queryKey: queryKeys.reminders.email(userId),
    queryFn: () => getEmailReminder(db, userId),
    enabled: Boolean(userId),
    networkMode: "always",
  });

  useEffect(() => {
    if (!userId || record.data === undefined) return;
    const key = queryKeys.reminders.email(userId);
    if (!confirmed && record.data === null) {
      void saveEmailReminder(db, userId, null).then(() => queryClient.invalidateQueries({ queryKey: key }));
    } else if (confirmed && record.data !== null) {
      void clearEmailReminder(db, userId).then(() => {
        void queryClient.invalidateQueries({ queryKey: key });
        showToast("Your email is confirmed", "success");
      });
    }
  }, [db, queryClient, userId, confirmed, record.data]);

  useEffect(() => {
    if (!userId || confirmed) return;
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") void refreshUser();
    });
    return () => subscription.remove();
    // refreshUser is rebuilt each render; the listener only needs the latest user.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, confirmed]);
}
