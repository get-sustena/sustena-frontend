// src/components/bootstrap/AppBootstrapGate.tsx

import { useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { ReactNode, useEffect } from "react";
import { StyleSheet, View } from "react-native";
import { useAppBootstrap } from "../../hooks/useAppBootstrap";
import { useAuthBootstrap } from "../../hooks/useAuthBootstrap";
import { clearLocalAccountData } from "../../db/accountDataRepository";
import { resetLocalAccountStores } from "../../lib/accountSession";
import { markWelcomeSeen } from "../../db/appMetadataRepository";
import { setAuthFailureHandler } from "../../lib/api/authEvents";
import { useAuthStore } from "../../store/authStore";
import { theme } from "../../theme/theme";
import { AppText } from "../ui/AppText";
import { ProgressLoader } from "../ui/ProgressLoader";

type Props = {
  children: ReactNode;
};

export function AppBootstrapGate({ children }: Props) {
  const db = useSQLiteContext();
  useAuthBootstrap();

  const isHydratingAuth = useAuthStore((state) => state.isHydratingAuth);
  const { isBootstrapping, bootstrapError } = useAppBootstrap(
    !isHydratingAuth
  );
  const queryClient = useQueryClient();
  const clearAuth = useAuthStore((state) => state.clearAuth);

  useEffect(() => {
    setAuthFailureHandler(() => {
      clearAuth();
      queryClient.clear();
      void clearLocalAccountData(db)
        .catch(() => undefined)
        .finally(resetLocalAccountStores);
      void markWelcomeSeen(db).catch(() => undefined);
      router.replace("/auth");
    });

    return () => {
      setAuthFailureHandler(null);
    };
  }, [clearAuth, db, queryClient]);

  if (isBootstrapping) {
    return <ProgressLoader variant="screen" />;
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
