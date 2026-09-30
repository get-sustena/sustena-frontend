
import { Pressable, StyleSheet, ViewStyle } from "react-native";
import { theme } from "../../theme/theme";
import { Icon, IconName } from "./Icon";

type IconButtonVariant = "solid" | "outline" | "ghost";
type IconButtonSize = "sm" | "md" | "lg";

type Props = {
  name: IconName;
  onPress?: () => void;
  variant?: IconButtonVariant;
  size?: IconButtonSize;
  color?: string;
  disabled?: boolean;
  style?: ViewStyle;
};

const DIMENSIONS: Record<IconButtonSize, number> = { sm: 32, md: 40, lg: 48 };
const ICON_SIZES: Record<IconButtonSize, number> = { sm: 16, md: 20, lg: 22 };

export function IconButton({
  name,
  onPress,
  variant = "ghost",
  size = "md",
  color,
  disabled = false,
  style,
}: Props) {
  const dimension = DIMENSIONS[size];
  const iconSize = ICON_SIZES[size];
  const iconColor =
    color ?? (variant === "solid" ? theme.colors.onDark : theme.colors.text);

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.base,
        { width: dimension, height: dimension, borderRadius: dimension / 2 },
        styles[variant],
        pressed && !disabled && styles.pressed,
        disabled && styles.disabled,
        style,
      ]}
    >
      <Icon name={name} size={iconSize} color={iconColor} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: "center",
    justifyContent: "center",
  },
  solid: {
    backgroundColor: theme.colors.primary,
  },
  outline: {
    backgroundColor: theme.colors.card,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
  },
  ghost: {
    backgroundColor: "transparent",
  },
  pressed: {
    opacity: 0.7,
    transform: [{ scale: 0.94 }],
  },
  disabled: {
    opacity: 0.4,
  },
});
