import { Redirect } from "expo-router";
import { ProgressLoader } from "../src/components/ui/ProgressLoader";
import { useAuthStore } from "../src/store/authStore";

export default function Index() {
  const isHydratingAuth = useAuthStore((state) => state.isHydratingAuth);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  if (isHydratingAuth) {
    return <ProgressLoader variant="screen" message="Checking your session..." />;
  }

  if (!isAuthenticated) {
    return <Redirect href="/welcome" />;
  }

  return <Redirect href="/(tabs)/home" />;
}
