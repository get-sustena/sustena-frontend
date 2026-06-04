// src/components/bootstrap/AppBootstrapGate.tsx

import { ReactNode } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { useAppBootstrap } from "../../hooks/useAppBootstrap";
import { theme } from "../../theme/theme";
import { AppText } from "../ui/AppText";

type Props = {
  children: ReactNode;
};

export function AppBootstrapGate({ children }: Props) {
  const { isBootstrapping, bootstrapError } = useAppBootstrap();

  if (isBootstrapping) {
    return (
      <View style={styles.container}>
        <ActivityIndicator color={theme.colors.primary} />
        <AppText style={styles.text}>Preparing CookEase…</AppText>
      </View>
    );
  }

  if (bootstrapError) {
    return (
      <View style={styles.container}>
        <AppText style={styles.icon}>⚠️</AppText>
        <AppText style={styles.title}>Something went wrong</AppText>
        <AppText style={styles.text}>{bootstrapError}</AppText>
      </View>
    );
  }

  return children;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: theme.spacing["2xl"],
  },
  icon: {
    fontSize: 42,
    marginBottom: theme.spacing.md,
  },
  title: {
    fontFamily: theme.fontFamily.display,
    fontSize: 24,
    color: theme.colors.cream,
    marginBottom: theme.spacing.sm,
  },
  text: {
    fontFamily: theme.fontFamily.body,
    fontSize: 13,
    color: theme.colors.textMuted,
    textAlign: "center",
    marginTop: theme.spacing.md,
  },
});
