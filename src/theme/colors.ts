// New palette (CookEase v2 redesign) — source of truth: redesign/CookEase App v2.html
// INK/ASH = text, BASIL = primary dark green (was navy), LEAF = success green,
// MARI = mustard accent (was orange), FENNEL = border green, COCO = bg/on-dark,
// PIST = light surface, OCHRE = gold, CHILI = danger red.
export const lightColors = {
  cream: "#FBFBF7", // COCO
  cream2: "#EDF3E4", // PIST
  cream3: "#FFFFFF",

  navy: "#17291E", // BASIL
  navy2: "#20362A", // BASIL2
  navy3: "#1f7048", // LEAFD
  navyDim: "rgba(23,41,30,0.08)",
  navyDim2: "rgba(23,41,30,0.16)",

  orange: "#E3A62E", // MARI
  orange2: "#D2971F", // MARID
  orangeDim: "rgba(227,166,46,0.12)",
  orangeDim2: "rgba(227,166,46,0.2)",

  text: "#1B211C", // INK
  textMedium: "#5C6459", // ASH
  textMuted: "#8A9187", // MUT
  textDim: "#BCCBB6", // NAVMUT

  onDark: "#FBFBF7", // COCO
  onDark2: "rgba(251,251,247,0.65)",
  onDark3: "rgba(251,251,247,0.35)",

  white: "#FFFFFF",
  surface: "#FFFFFF",
  surface2: "#EDF3E4", // PIST
  surfaceAlt: "#EDF3E4", // PIST

  green: "#34B673", // LEAF
  greenDim: "rgba(52,182,115,0.12)",
  // Distinct from `navy3`/LEAFD — this is the brighter accent green used
  // pervasively for tappable text links ("Shuffle", "See all", "Sign in").
  linkGreen: "#279A5F",

  red: "#C0392E", // CHILI
  redText: "#8A2C22", // CHILIT — deeper red for text-on-light-danger-bg
  gold: "#C68A2E", // OCHRE
  goldText: "#8A5F13", // OCHRET — deeper gold for text-on-light-warning-bg
  textMutedAlt: "#93A184", // MUT2

  border: "#D8E3CA", // FENNEL
  border2: "rgba(23,41,30,0.16)",
  borderStrong: "rgba(23,41,30,0.22)",
  borderOrange: "rgba(227,166,46,0.25)",

  background: "#FBFBF7", // COCO
  card: "#FFFFFF",
  card2: "#EDF3E4", // PIST

  primary: "#17291E", // BASIL
  primaryLight: "#20362A", // BASIL2
  primaryDim: "rgba(23,41,30,0.08)",

  accent: "#E3A62E", // MARI
  accentLight: "#D2971F", // MARID
  accentDim: "rgba(227,166,46,0.12)",

  success: "#34B673", // LEAF
  danger: "#C0392E", // CHILI
  warning: "#C68A2E", // OCHRE

  black: "#000000",
} as const;
