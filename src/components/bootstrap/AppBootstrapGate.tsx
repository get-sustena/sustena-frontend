
import { useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { ReactNode, useEffect, useRef } from "react";
import { StyleSheet, View } from "react-native";
import { useActivityTracker } from "../../hooks/useActivity";
import { useAppBootstrap } from "../../hooks/useAppBootstrap";
import { useAuthBootstrap } from "../../hooks/useAuthBootstrap";
import { useSocialRefusals } from "../../hooks/useSocialRefusals";
import { clearLocalAccountData } from "../../db/accountDataRepository";
import { resetLocalAccountStores } from "../../lib/accountSession";
import { waitForAccountBackgroundTasks } from "../../lib/accountBackgroundTasks";
import { markWelcomeSeen } from "../../db/appMetadataRepository";
import { setAuthFailureHandler, setEmailNotVerifiedHandler } from "../../lib/api/authEvents";
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
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const isSigningOut = useAuthStore((state) => state.isSigningOut);
  // A new account waiting for its email code can't load anything else yet.
  const emailVerificationRequired = useAuthStore((state) => Boolean(state.user?.emailVerificationRequired));
  const { isBootstrapping, bootstrapError } = useAppBootstrap(
    !isHydratingAuth && isAuthenticated && !isSigningOut && !emailVerificationRequired
  );
  useActivityTracker(!isHydratingAuth && !isBootstrapping);
  useSocialRefusals();
  const queryClient = useQueryClient();
  const clearAuth = useAuthStore((state) => state.clearAuth);
  const beginSignOut = useAuthStore((state) => state.beginSignOut);
  const handlingAuthFailure = useRef(false);

  useEffect(() => {
    if (!isAuthenticated) {
      handlingAuthFailure.current = false;
      setAuthFailureHandler(null);
      return;
    }

    setAuthFailureHandler(() => {
      if (handlingAuthFailure.current || useAuthStore.getState().isSigningOut) {
        return;
      }

      handlingAuthFailure.current = true;
      beginSignOut();
      void (async () => {
        try {
          await queryClient.cancelQueries();
          await waitForAccountBackgroundTasks();
          await clearLocalAccountData(db);
        } catch (error) {
          console.warn("Failed to clear local account data after session expiry", error);
        } finally {
          clearAuth();
          queryClient.clear();
          resetLocalAccountStores();
          await markWelcomeSeen(db).catch(() => undefined);
          router.replace("/auth");
        }
      })();
    });

    return () => {
      setAuthFailureHandler(null);
    };
  }, [beginSignOut, clearAuth, db, isAuthenticated, queryClient]);

  // The API refused a request until the emailed code is entered: the guard
  // in app/_layout.tsx then shows the code screen.
  useEffect(() => {
    setEmailNotVerifiedHandler(() => {
      const { user, setUser } = useAuthStore.getState();
      if (user && !user.emailVerificationRequired) {
        setUser({ ...user, emailVerificationRequired: true });
      }
    });
    return () => setEmailNotVerifiedHandler(null);
  }, []);

  if (isHydratingAuth || isBootstrapping) {
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
