import { Redirect } from "expo-router";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { AppText } from "../src/components/ui/AppText";
import { useAuthStore } from "../src/store/authStore";
import { usePreferencesStore } from "../src/store/preferencesStore";
import { theme } from "../src/theme/theme";

export default function Index() {
  const isHydratingAuth = useAuthStore((state) => state.isHydratingAuth);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const hasCompletedOnboarding = usePreferencesStore(
    (state) => state.hasCompletedOnboarding
  );

  if (isHydratingAuth) {
    return (
      <View style={styles.container}>
        <ActivityIndicator color={theme.colors.primary} />
        <AppText style={styles.text}>Checking your session...</AppText>
      </View>
    );
  }

  if (!isAuthenticated) {
    return <Redirect href="/welcome" />;
  }

  if (!hasCompletedOnboarding) {
    return <Redirect href="/onboarding/product" />;
  }

  return <Redirect href="/(tabs)/home" />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.background,
  },
  text: {
    marginTop: theme.spacing.md,
    color: theme.colors.textMuted,
  },
});
