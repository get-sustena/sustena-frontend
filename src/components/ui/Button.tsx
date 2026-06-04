import { Pressable, PressableProps, StyleSheet, ViewStyle } from "react-native";
import { theme } from "../../theme/theme";
import { AppText } from "./AppText";

type ButtonVariant = "primary" | "accent" | "outline" | "ghost" | "card";

type Props = PressableProps & {
  title: string;
  variant?: ButtonVariant;
  style?: ViewStyle;
};

export function Button({
  title,
  variant = "primary",
  style,
  disabled,
  ...props
}: Props) {
  const isGhost = variant === "ghost";
  const isOutline = variant === "outline";
  const isPrimary = variant === "primary";
  const isAccent = variant === "accent";

  return (
    <Pressable
      disabled={disabled}
      style={({ pressed }) => [
        styles.base,
        styles[variant],
        pressed && !disabled && styles.pressed,
        disabled && styles.disabled,
        style,
      ]}
      {...props}
    >
      <AppText
        style={[
          styles.text,
          isPrimary && styles.primaryText,
          isAccent && styles.accentText,
          isOutline && styles.outlineText,
          isGhost && styles.ghostText,
          variant === "card" && styles.cardText,
          disabled && styles.disabledText,
        ]}
      >
        {title}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 48,
    borderRadius: 14,
    paddingHorizontal: theme.spacing.xl,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
  },
  primary: {
    backgroundColor: theme.colors.navy,
  },
  accent: {
    backgroundColor: theme.colors.orange,
  },
  outline: {
    backgroundColor: "transparent",
    borderWidth: 1.5,
    borderColor: theme.colors.border2,
  },
  ghost: {
    backgroundColor: "transparent",
  },
  card: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
  },
  pressed: {
    opacity: 0.8,
    transform: [{ scale: 0.98 }],
  },
  disabled: {
    opacity: 0.5,
  },
  text: {
    fontFamily: theme.fontFamily.bodyBold,
    fontSize: 14,
    letterSpacing: 0.3,
  },
  primaryText: {
    color: theme.colors.onDark,
  },
  accentText: {
    color: theme.colors.white,
  },
  outlineText: {
    color: theme.colors.textMedium,
  },
  ghostText: {
    color: theme.colors.orange,
  },
  cardText: {
    color: theme.colors.text,
  },
  disabledText: {
    color: theme.colors.textMuted,
  },
});
