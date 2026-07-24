import { lightColors } from "./colors";
import { radius } from "./radius";
import { spacing } from "./spacing";
import { fontFamily, fontSize } from "./typography";

export const theme = {
  colors: lightColors,
  spacing,
  radius,
  fontFamily,
  fontSize,
} as const;

export type AppTheme = typeof theme;
