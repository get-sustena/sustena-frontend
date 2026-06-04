// src/components/ui/EmptyState.tsx

import { StyleSheet, View } from "react-native";
import { theme } from "../../theme/theme";
import { AppText } from "./AppText";

type Props = {
  icon: string;
  title?: string;
  message: string;
};

export function EmptyState({ icon, title, message }: Props) {
  return (
    <View style={styles.container}>
      <AppText style={styles.icon}>{icon}</AppText>

      {title ? <AppText style={styles.title}>{title}</AppText> : null}

      <AppText style={styles.message}>{message}</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: theme.spacing["2xl"],
    paddingVertical: 40,
    alignItems: "center",
  },
  icon: {
    fontSize: 48,
    opacity: 0.5,
    marginBottom: theme.spacing.md,
  },
  title: {
    fontFamily: theme.fontFamily.bodyBold,
    fontSize: 15,
    color: theme.colors.cream,
    marginBottom: theme.spacing.xs,
  },
  message: {
    fontFamily: theme.fontFamily.body,
    fontSize: 14,
    color: theme.colors.textMuted,
    textAlign: "center",
    lineHeight: 21,
  },
});
