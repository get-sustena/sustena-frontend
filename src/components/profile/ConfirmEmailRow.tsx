import { StyleSheet } from "react-native";
import { useEmailReminder } from "../../hooks/useEmailReminder";
import { linkWorksUntil } from "../../lib/reminders/homeReminders";
import { theme } from "../../theme/theme";
import { AppText } from "../ui/AppText";
import { SettingsRow } from "./SettingsRow";

// v6.9's Settings row (#settings-email-row) while the email isn't confirmed.
// Tapping it resends the link.
export function ConfirmEmailRow() {
  const email = useEmailReminder();
  if (!email.show) return null;

  return (
    <SettingsRow
      icon="mail"
      iconBackground={theme.colors.warningSoft}
      iconColor={theme.colors.warningIcon}
      label="Confirm your email"
      labelAccessory={<AppText style={styles.flag}>Not confirmed</AppText>}
      subtitle={
        email.sentOn
          ? `Link sent to ${email.email}. It works until ${linkWorksUntil(email.sentOn)}.`
          : `Resend the link to ${email.email}.`
      }
      rightElement={<AppText style={styles.resend}>Resend</AppText>}
      showChevron={false}
      onPress={email.isResending ? undefined : email.resend}
    />
  );
}

const styles = StyleSheet.create({
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
