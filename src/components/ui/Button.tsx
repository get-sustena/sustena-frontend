import { Pressable, PressableProps, StyleSheet, ViewStyle } from "react-native";
import { theme } from "../../theme/theme";
import { AppText } from "./AppText";
import { Icon, IconName } from "./Icon";

type ButtonVariant = "primary" | "accent" | "outline" | "ghost" | "card";

type Props = PressableProps & {
  title: string;
  variant?: ButtonVariant;
  icon?: IconName;
  style?: ViewStyle;
};

const TEXT_COLOR_BY_VARIANT: Record<ButtonVariant, string> = {
  primary: theme.colors.onDark,
  accent: theme.colors.text,
  outline: theme.colors.textMedium,
  ghost: theme.colors.orange,
  card: theme.colors.text,
};

export function Button({
  title,
  variant = "primary",
  icon,
  style,
  disabled,
  ...props
}: Props) {
  const isGhost = variant === "ghost";
  const isOutline = variant === "outline";
  const isPrimary = variant === "primary";
  const isAccent = variant === "accent";
  const iconColor = disabled
    ? theme.colors.textMuted
    : TEXT_COLOR_BY_VARIANT[variant];

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
      {icon ? <Icon name={icon} size={16} color={iconColor} /> : null}

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
    borderRadius: theme.radius.md,
    paddingHorizontal: theme.spacing.xl,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: theme.spacing.sm,
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
    fontSize: theme.fontSize.md,
    letterSpacing: 0.3,
  },
  primaryText: {
    color: theme.colors.onDark,
  },
  accentText: {
    color: theme.colors.text,
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
