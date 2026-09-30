
import { ReactNode } from "react";
import { StyleSheet, View, ViewProps } from "react-native";
import { theme } from "../../theme/theme";

type Props = ViewProps & {
  children: ReactNode;
  variant?: "default" | "strong";
};

export function Card({
  children,
  variant = "default",
  style,
  ...props
}: Props) {
  return (
    <View style={[styles.base, styles[variant], style]} {...props}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    padding: theme.spacing.lg,
  },
  default: {
    backgroundColor: theme.colors.card,
    borderColor: theme.colors.border,
  },
  strong: {
    backgroundColor: theme.colors.card2,
    borderColor: theme.colors.borderStrong,
  },
});
