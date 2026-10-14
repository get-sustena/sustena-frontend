// The web build's fonts: the same families as fontSources.ts, as WOFF2 cut
// down to the characters the app uses (Latin, punctuation, ₦, fractions),
// about 237 KB for all seven instead of 1.6 MB of TTF. They're made from the
// TTFs in @expo-google-fonts with fontTools (pyftsubset --flavor=woff2).
export const fontSources = {
  Inter_400Regular: require("../../assets/fonts/web/Inter_400Regular.woff2"),
  Inter_500Medium: require("../../assets/fonts/web/Inter_500Medium.woff2"),
  Inter_600SemiBold: require("../../assets/fonts/web/Inter_600SemiBold.woff2"),
  Inter_700Bold: require("../../assets/fonts/web/Inter_700Bold.woff2"),
  BricolageGrotesque_600SemiBold: require("../../assets/fonts/web/BricolageGrotesque_600SemiBold.woff2"),
  BricolageGrotesque_700Bold: require("../../assets/fonts/web/BricolageGrotesque_700Bold.woff2"),
  BricolageGrotesque_800ExtraBold: require("../../assets/fonts/web/BricolageGrotesque_800ExtraBold.woff2"),
};
