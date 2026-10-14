// The web build's fonts: the same families as fontSources.ts, as WOFF2 cut
// down to the characters the app uses (Latin, punctuation, ₦, fractions),
// about 237 KB for all seven instead of 1.6 MB of TTF. They're made from the
// TTFs in @expo-google-fonts with fontTools (pyftsubset --flavor=woff2).
import BricolageGrotesque_600SemiBold from "../../assets/fonts/web/BricolageGrotesque_600SemiBold.woff2";
import BricolageGrotesque_700Bold from "../../assets/fonts/web/BricolageGrotesque_700Bold.woff2";
import BricolageGrotesque_800ExtraBold from "../../assets/fonts/web/BricolageGrotesque_800ExtraBold.woff2";
import Inter_400Regular from "../../assets/fonts/web/Inter_400Regular.woff2";
import Inter_500Medium from "../../assets/fonts/web/Inter_500Medium.woff2";
import Inter_600SemiBold from "../../assets/fonts/web/Inter_600SemiBold.woff2";
import Inter_700Bold from "../../assets/fonts/web/Inter_700Bold.woff2";

export const fontSources = {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  BricolageGrotesque_600SemiBold,
  BricolageGrotesque_700Bold,
  BricolageGrotesque_800ExtraBold,
};
