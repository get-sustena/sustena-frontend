
// One import per weight, as the expo-google-fonts README shows: importing a
// package's index pulls every weight and italic into the app bundle.
import { BricolageGrotesque_600SemiBold } from "@expo-google-fonts/bricolage-grotesque/600SemiBold";
import { BricolageGrotesque_700Bold } from "@expo-google-fonts/bricolage-grotesque/700Bold";
import { BricolageGrotesque_800ExtraBold } from "@expo-google-fonts/bricolage-grotesque/800ExtraBold";
import { Inter_400Regular } from "@expo-google-fonts/inter/400Regular";
import { Inter_500Medium } from "@expo-google-fonts/inter/500Medium";
import { Inter_600SemiBold } from "@expo-google-fonts/inter/600SemiBold";
import { Inter_700Bold } from "@expo-google-fonts/inter/700Bold";
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
import { useMealReminders } from "../src/hooks/useMealReminders";
import { configureMealReminderNotifications } from "../src/lib/notifications/mealReminders";
import { SIGNED_IN_ROUTES } from "../src/lib/navigation/routeAccess";
import { queryClient } from "../src/lib/query/queryClient";
import { setupNetworkStatusListener } from "../src/lib/query/networkStatus";
import { useAuthStore } from "../src/store/authStore";
import { theme } from "../src/theme/theme";

SplashScreen.preventAutoHideAsync();
setupNetworkStatusListener();
configureMealReminderNotifications();

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    BricolageGrotesque_600SemiBold,
    BricolageGrotesque_700Bold,
    BricolageGrotesque_800ExtraBold,
  });

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
  useMealReminders();

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
      <Stack.Protected guard={isAuthenticated}>
        {SIGNED_IN_ROUTES.map((name) => (
          <Stack.Screen key={name} name={name} />
        ))}
      </Stack.Protected>
    </Stack>
  );
}

function RootLoading() {
  return <ProgressLoader variant="screen" />;
}
