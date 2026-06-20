// app/_layout.tsx

import {
  PlayfairDisplay_700Bold,
  useFonts as usePlayfairFonts,
} from "@expo-google-fonts/playfair-display";
import {
  PlusJakartaSans_400Regular,
  PlusJakartaSans_500Medium,
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
  useFonts as useJakartaFonts,
} from "@expo-google-fonts/plus-jakarta-sans";
import { QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { SQLiteProvider } from "expo-sqlite";
import { StatusBar } from "expo-status-bar";
import { Suspense, useEffect } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { AppBootstrapGate } from "../src/components/bootstrap/AppBootstrapGate";
import { PersistenceEffects } from "../src/components/bootstrap/PersistenceEffects";
import { migrateDbIfNeeded } from "../src/db/migrations";
import { queryClient } from "../src/lib/query/queryClient";
import { theme } from "../src/theme/theme";

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [playfairLoaded] = usePlayfairFonts({
    PlayfairDisplay_700Bold,
  });

  const [jakartaLoaded] = useJakartaFonts({
    PlusJakartaSans_400Regular,
    PlusJakartaSans_500Medium,
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold,
  });

  const fontsLoaded = playfairLoaded && jakartaLoaded;

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
          </AppBootstrapGate>
        </SQLiteProvider>
      </Suspense>
    </QueryClientProvider>
  );
}

function RootLoading() {
  return (
    <View style={styles.loading}>
      <ActivityIndicator color={theme.colors.primary} />
    </View>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.background,
  },
});
