
import { QueryClientProvider } from "@tanstack/react-query";
import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { SQLiteProvider } from "expo-sqlite";
import { StatusBar } from "expo-status-bar";
import { Suspense, useEffect } from "react";
import { AppBootstrapGate } from "../src/components/bootstrap/AppBootstrapGate";
import { PersistenceEffects } from "../src/components/bootstrap/PersistenceEffects";
import { WebGlobalStyles } from "../src/components/bootstrap/WebGlobalStyles";
import { WebAppFrame } from "../src/components/layout/WebAppFrame";
import { BottomSheetHost } from "../src/components/ui/BottomSheet";
import { ProgressLoader } from "../src/components/ui/ProgressLoader";
import { ToastHost } from "../src/components/ui/Toast";
import { migrateDbIfNeeded } from "../src/db/migrations";
import { useLearnTimerAlerts } from "../src/hooks/useLearnTimerAlerts";
import { useMealReminders } from "../src/hooks/useMealReminders";
import { configureForegroundNotifications } from "../src/lib/notifications/foregroundNotifications";
import { AGREEMENT_ROUTES, SIGNED_IN_ROUTES } from "../src/lib/navigation/routeAccess";
import { queryClient } from "../src/lib/query/queryClient";
import { setupNetworkStatusListener } from "../src/lib/query/networkStatus";
import { useAuthStore } from "../src/store/authStore";
import { fontSources } from "../src/theme/fontSources";
import { theme } from "../src/theme/theme";

SplashScreen.preventAutoHideAsync();
setupNetworkStatusListener();
configureForegroundNotifications();

export default function RootLayout() {
  const [fontsLoaded] = useFonts(fontSources);

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) {
    return null;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <WebGlobalStyles />
      <Suspense fallback={<RootLoading />}>
        <SQLiteProvider
          databaseName="cookeasev2.db"
          onInit={migrateDbIfNeeded}
          useSuspense
        >
          <WebAppFrame>
            <AppBootstrapGate>
              <PersistenceEffects />

              <StatusBar style="dark" />
              <RootNavigator />

              <ToastHost />
              <BottomSheetHost />
            </AppBootstrapGate>
          </WebAppFrame>
        </SQLiteProvider>
      </Suspense>
    </QueryClientProvider>
  );
}

// Reads the session itself rather than taking it from RootLayout. Rendered
// inside AppBootstrapGate, it always sees the current sign-in state when the
// stack mounts; a value passed down from RootLayout could be a render behind
// and send a signed-in user to the welcome screen.
function RootNavigator() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  // Accounts that haven't agreed to the current Terms see only the agreement.
  const agreementRequired = useAuthStore((state) => Boolean(state.user?.agreementRequired));
  useMealReminders();
  useLearnTimerAlerts();

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: {
          backgroundColor: theme.colors.background,
        },
      }}
    >
      {/* Listed first so a signed-out visitor sent away from a signed-in
          screen lands here and is redirected onward. */}
      <Stack.Screen name="index" />
      <Stack.Protected guard={isAuthenticated && !agreementRequired}>
        {SIGNED_IN_ROUTES.map((name) => (
          <Stack.Screen key={name} name={name} />
        ))}
      </Stack.Protected>
      <Stack.Protected guard={isAuthenticated && agreementRequired}>
        {AGREEMENT_ROUTES.map((name) => (
          <Stack.Screen key={name} name={name} />
        ))}
      </Stack.Protected>
    </Stack>
  );
}

function RootLoading() {
  return <ProgressLoader variant="screen" />;
}
