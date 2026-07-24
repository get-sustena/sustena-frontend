// src/components/auth/PasswordMatchIndicator.tsx

import { StyleSheet, View } from "react-native";
import { theme } from "../../theme/theme";
import { AppText } from "../ui/AppText";
import { Icon } from "../ui/Icon";

export function PasswordMatchIndicator({
  password,
  confirmPassword,
}: {
  password: string;
  confirmPassword: string;
}) {
  if (!confirmPassword) return null;

  const matches = password === confirmPassword;

  return (
    <View style={styles.row}>
      <View style={[styles.icon, matches ? styles.iconMatch : styles.iconMismatch]}>
        <Icon
          name={matches ? "check" : "close"}
          size={9}
          color={theme.colors.onDark}
          strokeWidth={3}
        />
      </View>

      <AppText style={[styles.text, matches ? styles.textMatch : styles.textMismatch]}>
        {matches ? "Passwords match" : "Passwords don't match"}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: -6,
    marginBottom: theme.spacing.lg,
  },
  icon: {
    width: 14,
    height: 14,
    borderRadius: 7,
    alignItems: "center",
    justifyContent: "center",
  },
  iconMatch: {
    backgroundColor: theme.colors.green,
  },
  iconMismatch: {
    backgroundColor: theme.colors.red,
  },
  text: {
    fontFamily: theme.fontFamily.body,
    fontSize: 12.5,
  },
  textMatch: {
    color: theme.colors.navy,
  },
  textMismatch: {
    color: theme.colors.red,
  },
});
