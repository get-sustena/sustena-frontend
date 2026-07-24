import { StyleSheet, Text, TextProps } from "react-native";
import { theme } from "../../theme/theme";

type AppTextVariant =
  | "body"
  | "muted"
  | "dim"
  | "label"
  | "mono"
  | "title"
  | "display"
  | "button";

type Props = TextProps & {
  variant?: AppTextVariant;
};

export function AppText({ variant = "body", style, ...props }: Props) {
  return <Text style={[styles[variant], style]} {...props} />;
}

const styles = StyleSheet.create({
  body: {
    fontFamily: theme.fontFamily.body,
    fontSize: theme.fontSize.md,
    color: theme.colors.text,
  },
  muted: {
    fontFamily: theme.fontFamily.body,
    fontSize: theme.fontSize.sm,
    color: theme.colors.textMuted,
  },
  dim: {
    fontFamily: theme.fontFamily.body,
    fontSize: theme.fontSize.xs,
    color: theme.colors.textDim,
  },
  label: {
    fontFamily: theme.fontFamily.mono,
    fontSize: theme.fontSize.xs,
    color: theme.colors.textMuted,
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },
  mono: {
    fontFamily: theme.fontFamily.mono,
    fontSize: theme.fontSize.md,
    color: theme.colors.text,
  },
  title: {
    fontFamily: theme.fontFamily.display,
    fontSize: theme.fontSize["3xl"],
    color: theme.colors.navy,
    lineHeight: 30,
  },
  display: {
    fontFamily: theme.fontFamily.display,
    fontSize: theme.fontSize["4xl"],
    color: theme.colors.navy,
    lineHeight: 38,
  },
  button: {
    fontFamily: theme.fontFamily.bodyBold,
    fontSize: theme.fontSize.md,
    color: theme.colors.onDark,
  },
});
