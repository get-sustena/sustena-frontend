import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Href, router } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { Pressable, StyleSheet, View } from "react-native";
import { getProfileReminderDismissedOn, saveProfileReminderDismissedOn } from "../../db/homeRemindersRepository";
import { useEmailConfirmedNotice, useEmailReminder } from "../../hooks/useEmailReminder";
import { getLagosDay } from "../../lib/lagosDay";
import { countAnsweredProfileFields, PROFILE_COMPLETION_FIELD_COUNT } from "../../lib/profileCompletion";
import { queryKeys } from "../../lib/query/queryKeys";
import { homeReminder, linkWorksUntil } from "../../lib/reminders/homeReminders";
import { useAuthStore } from "../../store/authStore";
import { useProfileAnswersStore } from "../../store/profileAnswersStore";
import { showToast } from "../../store/uiStore";
import { theme } from "../../theme/theme";
import { AppText } from "../ui/AppText";
import { Icon } from "../ui/Icon";

// v6.9's one reminder at the top of Home (#email-reminder): "Confirm your
// email" first, then "Complete your profile". The two never stack.
export function HomeReminder() {
  const db = useSQLiteContext();
  const queryClient = useQueryClient();
  useEmailConfirmedNotice();
  const email = useEmailReminder();
  const user = useAuthStore((state) => state.user);
  const answers = useProfileAnswersStore();
  const answered = countAnsweredProfileFields(answers);
  const userId = user?.id ?? "";
  const dismissed = useQuery({
    queryKey: queryKeys.reminders.profile(userId),
    queryFn: () => getProfileReminderDismissedOn(db, userId),
    enabled: Boolean(userId),
    networkMode: "always",
  });
  const today = getLagosDay();

  // Wait for the dismissal on this phone, so a dismissed card doesn't flash.
  const which =
    user && dismissed.data === undefined
      ? null
      : homeReminder({
          emailConfirmed: user ? Boolean(user.emailVerifiedAt) : null,
          answered,
          total: PROFILE_COMPLETION_FIELD_COUNT,
          dismissedOn: dismissed.data ?? null,
          today,
        });

  async function dismissProfile() {
    await saveProfileReminderDismissedOn(db, userId, today);
    await queryClient.invalidateQueries({ queryKey: queryKeys.reminders.profile(userId) });
    showToast("You can finish your profile any time in Settings");
  }

  if (which === "email") {
    const sent = email.sentOn !== null;
    return (
      <View style={styles.slot}>
        <View style={[styles.card, styles.emailCard, sent && styles.sentCard]} accessibilityLiveRegion="polite">
          <View style={styles.icon}>
            <Icon name={sent ? "check" : "mail"} size={18} color={sent ? theme.colors.navy3 : theme.colors.warningIcon} strokeWidth={2} />
          </View>
          <View style={styles.main}>
            <AppText style={[styles.title, sent ? styles.sentTitle : styles.emailTitle]}>{sent ? "Check your inbox" : "Confirm your email"}</AppText>
            {sent ? (
              <AppText style={[styles.body, styles.sentBody]}>
                We sent a new link to <AppText style={styles.strong}>{email.email}</AppText>. It works until {linkWorksUntil(email.sentOn!)}. If you can’t find it, check your spam folder.
              </AppText>
            ) : (
              <AppText style={[styles.body, styles.emailBody]}>
                Open the link we sent to <AppText style={styles.strong}>{email.email}</AppText> to confirm it’s yours.
              </AppText>
            )}
            <Pressable
              accessibilityRole="button"
              disabled={email.isResending}
              onPress={email.resend}
              style={({ pressed }) => [sent ? styles.linkButton : styles.button, pressed && styles.pressed]}
            >
              <AppText style={sent ? styles.linkButtonText : styles.buttonText}>Resend email</AppText>
            </Pressable>
          </View>
        </View>
      </View>
    );
  }

  if (which === "profile") {
    const total = PROFILE_COMPLETION_FIELD_COUNT;
    return (
      <View style={styles.slot}>
        <View style={[styles.card, styles.profileCard]}>
          <View style={[styles.icon, styles.profileIcon]}>
            <Icon name="profile" size={18} color={theme.colors.navy3} strokeWidth={2} />
          </View>
          <View style={styles.main}>
            <AppText style={[styles.title, styles.profileTitle]}>Complete your profile</AppText>
            <AppText style={[styles.body, styles.profileBody]}>Answer a few questions to get recipes and meal plans that suit you.</AppText>
            <View
              style={styles.bar}
              accessibilityRole="progressbar"
              accessibilityLabel="Profile questions answered"
              accessibilityValue={{ min: 0, max: total, now: answered }}
            >
              <View style={[styles.barFill, { width: `${Math.round((answered / total) * 100)}%` }]} />
            </View>
            <AppText style={styles.count}>{answered} of {total} answered</AppText>
            <Pressable
              accessibilityRole="button"
              onPress={() => router.push("/profile-complete" as Href)}
              style={({ pressed }) => [styles.button, pressed && styles.pressed]}
            >
              <AppText style={styles.buttonText}>Complete profile</AppText>
            </Pressable>
          </View>
          <Pressable accessibilityRole="button" accessibilityLabel="Dismiss" onPress={() => void dismissProfile()} style={styles.close}>
            <Icon name="close" size={16} color={theme.colors.textMedium} strokeWidth={2} />
          </Pressable>
        </View>
      </View>
    );
  }

  return null;
}

// v6.9's .em-card and its parts.
const styles = StyleSheet.create({
  slot: { paddingTop: 16, paddingHorizontal: 20 },
  card: { flexDirection: "row", alignItems: "flex-start", gap: 12, padding: 16, borderRadius: 18, borderWidth: 0.75 },
  emailCard: { backgroundColor: theme.colors.warningSoft, borderColor: theme.colors.warningLine },
  sentCard: { backgroundColor: theme.colors.cream2, borderColor: "transparent" },
  profileCard: { position: "relative", backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
  icon: { width: 38, height: 38, borderRadius: 12, alignItems: "center", justifyContent: "center", backgroundColor: theme.colors.surface },
  profileIcon: { backgroundColor: theme.colors.cream2 },
  main: { flex: 1, minWidth: 0 },
  title: { fontFamily: theme.fontFamily.bodyBold, fontSize: 15, lineHeight: 19.5 },
  emailTitle: { color: theme.colors.warningStrong },
  sentTitle: { color: theme.colors.navy },
  profileTitle: { color: theme.colors.navy, paddingRight: 28 },
  body: { marginTop: 3, fontFamily: theme.fontFamily.body, fontSize: 13.5, lineHeight: 19.6 },
  emailBody: { color: theme.colors.warningText },
  sentBody: { color: theme.colors.navy },
  profileBody: { color: theme.colors.textMedium },
  strong: { fontFamily: theme.fontFamily.bodySemiBold },
  button: { alignSelf: "flex-start", marginTop: 12, minHeight: 40, paddingHorizontal: 16, borderRadius: 999, backgroundColor: theme.colors.navy, alignItems: "center", justifyContent: "center" },
  buttonText: { fontFamily: theme.fontFamily.bodySemiBold, fontSize: 13.5, color: theme.colors.surface },
  linkButton: { alignSelf: "flex-start", marginTop: 6, minHeight: 36, justifyContent: "center" },
  linkButtonText: { fontFamily: theme.fontFamily.bodySemiBold, fontSize: 13.5, color: theme.colors.navy3, textDecorationLine: "underline" },
  pressed: { opacity: 0.75 },
  bar: { height: 6, marginTop: 12, borderRadius: 999, backgroundColor: theme.colors.control, overflow: "hidden" },
  barFill: { height: "100%", borderRadius: 999, backgroundColor: theme.colors.navy3 },
  count: { marginTop: 6, fontFamily: theme.fontFamily.bodyMedium, fontSize: 12, lineHeight: 15.6, color: theme.colors.textMedium },
  close: { position: "absolute", top: 6, right: 6, width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
});
