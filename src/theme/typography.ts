// src/theme/typography.ts

export const fontFamily = {
  // Body/UI — Inter
  body: "Inter_400Regular",
  bodyMedium: "Inter_500Medium",
  bodySemiBold: "Inter_600SemiBold",
  bodyBold: "Inter_700Bold",

  // Headings/display/logo wordmark — Bricolage Grotesque
  display: "BricolageGrotesque_700Bold",
  displayMedium: "BricolageGrotesque_500Medium",
  displaySemiBold: "BricolageGrotesque_600SemiBold",
  displayExtraBold: "BricolageGrotesque_800ExtraBold",

  // Uppercase mono labels / stat values — Geist Mono
  mono: "GeistMono_400Regular",
  monoMedium: "GeistMono_500Medium",
  monoSemiBold: "GeistMono_600SemiBold",
  monoBold: "GeistMono_700Bold",
} as const;

export const fontSize = {
  xs: 12,
  sm: 13,
  md: 14,
  base: 15,
  lg: 16,
  xl: 19,
  "2xl": 22,
  "3xl": 26,
  "4xl": 32,
} as const;
