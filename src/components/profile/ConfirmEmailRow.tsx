import { Pressable, StyleSheet, View } from "react-native";
import { useEmailReminder } from "../../hooks/useEmailReminder";
import { linkWorksUntil } from "../../lib/reminders/homeReminders";
import { theme } from "../../theme/theme";
import { AppText } from "../ui/AppText";
import { Icon } from "../ui/Icon";

// v6.9's Settings row (#settings-email-row) while the email isn't confirmed.
// Tapping it resends the link.
export function ConfirmEmailRow() {
  const email = useEmailReminder();
  if (!email.show) return null;

  return (
    <View style={styles.wrap}>
      <Pressable
        accessibilityRole="button"
        disabled={email.isResending}
        onPress={email.resend}
        style={({ pressed }) => [styles.row, pressed && styles.pressed]}
      >
        <View style={styles.iconBox}>
          <Icon name="mail" size={18} color={theme.colors.warningIcon} />
        </View>
        <View style={styles.main}>
          <View style={styles.titleRow}>
            <AppText style={styles.title}>Confirm your email</AppText>
            <AppText style={styles.flag}>Not confirmed</AppText>
          </View>
          <AppText style={styles.body}>
            {email.sentOn
              ? `Link sent to ${email.email}. It works until ${linkWorksUntil(email.sentOn)}.`
              : `Resend the link to ${email.email}.`}
          </AppText>
        </View>
        <AppText style={styles.resend}>Resend</AppText>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginTop: 12 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 14,
    borderBottomWidth: 0.75,
    borderBottomColor: theme.colors.border,
  },
  pressed: { backgroundColor: theme.colors.pressed },
  iconBox: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.warningSoft,
  },
  main: { flex: 1, minWidth: 0 },
  titleRow: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 6 },
  title: { fontFamily: theme.fontFamily.bodySemiBold, fontSize: 14, color: theme.colors.navy },
  body: { marginTop: 2, fontFamily: theme.fontFamily.body, fontSize: 12, color: theme.colors.textMedium },
  // v6.9's .em-flag.
  flag: {
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 999,
    overflow: "hidden",
    backgroundColor: theme.colors.warningSoft,
    color: theme.colors.warningInk,
    fontFamily: theme.fontFamily.bodySemiBold,
    fontSize: 11,
    lineHeight: 13.2,
  },
  resend: { fontFamily: theme.fontFamily.bodySemiBold, fontSize: 13, color: theme.colors.navy3 },
});
