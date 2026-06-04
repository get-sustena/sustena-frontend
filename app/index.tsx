import { Redirect } from "expo-router";
import { usePreferencesStore } from "../src/store/preferencesStore";

export default function Index() {
  const hasCompletedOnboarding = usePreferencesStore(
    (state) => state.hasCompletedOnboarding
  );

  if (!hasCompletedOnboarding) {
    return <Redirect href="/welcome" />;
  }

  return <Redirect href="/(tabs)/home" />;
}
