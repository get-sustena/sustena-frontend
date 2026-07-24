// app/_layout.tsx

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
import { BottomSheetHost } from "../src/components/ui/BottomSheet";
import { ProgressLoader } from "../src/components/ui/ProgressLoader";
import { ToastHost } from "../src/components/ui/Toast";
import { migrateDbIfNeeded } from "../src/db/migrations";
import { queryClient } from "../src/lib/query/queryClient";
import { setupNetworkStatusListener } from "../src/lib/query/networkStatus";
import { theme } from "../src/theme/theme";

SplashScreen.preventAutoHideAsync();
setupNetworkStatusListener();

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
      <Suspense fallback={<RootLoading />}>
        <SQLiteProvider
          databaseName="cookeasev2.db"
          onInit={migrateDbIfNeeded}
          useSuspense
        >
          <AppBootstrapGate>
            <PersistenceEffects />

            <StatusBar style="dark" backgroundColor={theme.colors.background} />
            <Stack
              screenOptions={{
                headerShown: false,
                contentStyle: {
                  backgroundColor: theme.colors.background,
                },
              }}
            />

            <ToastHost />
            <BottomSheetHost />
          </AppBootstrapGate>
        </SQLiteProvider>
      </Suspense>
    </QueryClientProvider>
  );
}

function RootLoading() {
  return <ProgressLoader variant="screen" message="Preparing Sustena..." />;
}
