import { StyleSheet, Text, TextProps } from "react-native";
import { theme } from "../../theme/theme";

type AppTextVariant =
  | "body"
  | "muted"
  | "dim"
  | "label"
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
    fontSize: 14,
    color: theme.colors.text,
  },
  muted: {
    fontFamily: theme.fontFamily.body,
    fontSize: 13,
    color: theme.colors.textMuted,
  },
  dim: {
    fontFamily: theme.fontFamily.body,
    fontSize: 12,
    color: theme.colors.textDim,
  },
  label: {
    fontFamily: theme.fontFamily.bodyBold,
    fontSize: 10,
    color: theme.colors.textMuted,
    letterSpacing: 1.5,
    textTransform: "uppercase",
  },
  title: {
    fontFamily: theme.fontFamily.display,
    fontSize: 24,
    color: theme.colors.navy,
    lineHeight: 28,
  },
  display: {
    fontFamily: theme.fontFamily.display,
    fontSize: 34,
    color: theme.colors.navy,
    lineHeight: 40,
  },
  button: {
    fontFamily: theme.fontFamily.bodyBold,
    fontSize: 14,
    color: theme.colors.onDark,
  },
});
