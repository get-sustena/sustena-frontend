// The app's fonts, loaded once at start. On phones they're the TTF files
// bundled with the app; the web build uses fontSources.web.ts.
// One import per weight, as the expo-google-fonts README shows: importing a
// package's index pulls every weight and italic into the app bundle.
import { BricolageGrotesque_600SemiBold } from "@expo-google-fonts/bricolage-grotesque/600SemiBold";
import { BricolageGrotesque_700Bold } from "@expo-google-fonts/bricolage-grotesque/700Bold";
import { BricolageGrotesque_800ExtraBold } from "@expo-google-fonts/bricolage-grotesque/800ExtraBold";
import { Inter_400Regular } from "@expo-google-fonts/inter/400Regular";
import { Inter_500Medium } from "@expo-google-fonts/inter/500Medium";
import { Inter_600SemiBold } from "@expo-google-fonts/inter/600SemiBold";
import { Inter_700Bold } from "@expo-google-fonts/inter/700Bold";

export const fontSources = {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  BricolageGrotesque_600SemiBold,
  BricolageGrotesque_700Bold,
  BricolageGrotesque_800ExtraBold,
};
