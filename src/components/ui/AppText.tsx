import { StyleSheet, Text, TextProps } from "react-native";
import { theme } from "../../theme/theme";

type AppTextVariant = "body" | "title";

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
  title: {
    fontFamily: theme.fontFamily.display,
    fontSize: theme.fontSize["3xl"],
    color: theme.colors.navy,
    lineHeight: 30,
  },
});
