// src/components/auth/AuthPrimaryButton.tsx

import { Pressable, StyleSheet } from "react-native";
import { theme } from "../../theme/theme";
import { AppText } from "../ui/AppText";

export function AuthPrimaryButton({
  title,
  onPress,
  disabled,
  dark,
}: {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  dark?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.button,
        dark && styles.buttonDark,
        pressed && !disabled && styles.pressed,
        disabled && styles.disabled,
      ]}
    >
      <AppText style={[styles.text, dark && styles.textDark]}>
        {title}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 49,
    borderRadius: 999,
    backgroundColor: theme.colors.accent,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonDark: {
    backgroundColor: theme.colors.navy,
  },
  pressed: {
    opacity: 0.9,
  },
  disabled: {
    opacity: 0.5,
  },
  text: {
    fontFamily: theme.fontFamily.bodyBold,
    fontSize: 15.5,
    color: theme.colors.navy,
  },
  textDark: {
    color: theme.colors.onDark,
  },
});
