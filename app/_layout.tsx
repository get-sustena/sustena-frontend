
import {
  BricolageGrotesque_500Medium,
  BricolageGrotesque_600SemiBold,
  BricolageGrotesque_700Bold,
  BricolageGrotesque_800ExtraBold,
  useFonts as useBricolageFonts,
} from "@expo-google-fonts/bricolage-grotesque";
import {
  GeistMono_400Regular,
  GeistMono_500Medium,
  GeistMono_600SemiBold,
  GeistMono_700Bold,
  useFonts as useGeistMonoFonts,
} from "@expo-google-fonts/geist-mono";
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts as useInterFonts,
} from "@expo-google-fonts/inter";
import { QueryClientProvider } from "@tanstack/react-query";
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
  const [interLoaded] = useInterFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  const [bricolageLoaded] = useBricolageFonts({
    BricolageGrotesque_500Medium,
    BricolageGrotesque_600SemiBold,
    BricolageGrotesque_700Bold,
    BricolageGrotesque_800ExtraBold,
  });

  const [geistMonoLoaded] = useGeistMonoFonts({
    GeistMono_400Regular,
    GeistMono_500Medium,
    GeistMono_600SemiBold,
    GeistMono_700Bold,
  });

  const fontsLoaded = interLoaded && bricolageLoaded && geistMonoLoaded;

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
