import { Pressable, PressableProps, StyleSheet, ViewStyle } from "react-native";
import { theme } from "../../theme/theme";
import { AppText } from "./AppText";
import { Icon, IconName } from "./Icon";

type ButtonVariant = "primary" | "ghost";

type Props = PressableProps & {
  title: string;
  variant?: ButtonVariant;
  icon?: IconName;
  style?: ViewStyle;
};

const TEXT_COLOR_BY_VARIANT: Record<ButtonVariant, string> = {
  primary: theme.colors.onDark,
  ghost: theme.colors.orange,
};

// v6.8's primary button (.saved-recipes-v65__browse): a 50px pill with Inter
// Bold 15 and no letter spacing.
export function Button({
  title,
  variant = "primary",
  icon,
  style,
  disabled,
  ...props
}: Props) {
  const textColor = disabled
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
      {icon ? <Icon name={icon} size={16} color={textColor} /> : null}

      <AppText style={[styles.text, { color: textColor }]}>{title}</AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 50,
    borderRadius: theme.radius.full,
    paddingHorizontal: 26,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: theme.spacing.sm,
  },
  primary: {
    backgroundColor: theme.colors.navy,
  },
  ghost: {
    backgroundColor: "transparent",
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
    fontSize: 15,
  },
});
