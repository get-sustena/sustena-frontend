// v6.8 uses Inter and Bricolage Grotesque only.
export const fontFamily = {
  body: "Inter_400Regular",
  bodyMedium: "Inter_500Medium",
  bodySemiBold: "Inter_600SemiBold",
  bodyBold: "Inter_700Bold",

  display: "BricolageGrotesque_700Bold",
  // The nearest static weight to v6.8's 650, used by the recipe editor.
  displaySemiBold: "BricolageGrotesque_600SemiBold",
  displayExtraBold: "BricolageGrotesque_800ExtraBold",
} as const;

export const fontSize = {
  md: 14,
  "3xl": 26,
} as const;
