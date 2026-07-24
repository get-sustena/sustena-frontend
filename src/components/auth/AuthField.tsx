// src/components/auth/AuthField.tsx

import { useState } from "react";
import { Pressable, StyleSheet, TextInput, View } from "react-native";
import { theme } from "../../theme/theme";
import { AppText } from "../ui/AppText";
import { Icon, IconName } from "../ui/Icon";

const FIELD_ICON_COLOR = "#4F8C68";

type Props = {
  label: string;
  placeholder: string;
  icon: IconName;
  value: string;
  onChangeText: (value: string) => void;
  secureTextEntry?: boolean;
  keyboardType?: "default" | "email-address" | "number-pad";
  autoCapitalize?: "none" | "sentences" | "words" | "characters";
  error?: string;
};

export function AuthField({
  label,
  placeholder,
  icon,
  value,
  onChangeText,
  secureTextEntry,
  keyboardType,
  autoCapitalize = "none",
  error,
}: Props) {
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const isPasswordField = Boolean(secureTextEntry);

  return (
    <View style={styles.field}>
      <AppText style={styles.label}>{label}</AppText>
      <View
        style={[
          styles.inputWrap,
          isFocused && styles.inputWrapFocused,
          error && styles.inputWrapError,
        ]}
      >
        <Icon name={icon} size={17} color={FIELD_ICON_COLOR} />

        <TextInput
          placeholder={placeholder}
          placeholderTextColor={theme.colors.textDim}
          value={value}
          onChangeText={onChangeText}
          secureTextEntry={isPasswordField && !isPasswordVisible}
          keyboardType={keyboardType}
          style={styles.input}
          autoCapitalize={autoCapitalize}
          autoCorrect={false}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
        />

        {isPasswordField ? (
          <Pressable
            onPress={() => setIsPasswordVisible((current) => !current)}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={
              isPasswordVisible ? "Hide password" : "Show password"
            }
          >
            <Icon
              name={isPasswordVisible ? "eyeOff" : "eye"}
              size={17}
              color={theme.colors.textMuted}
            />
          </Pressable>
        ) : null}
      </View>

      {error ? <AppText style={styles.errorText}>{error}</AppText> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  field: {
    marginBottom: 18,
  },
  label: {
    fontFamily: theme.fontFamily.monoSemiBold,
    fontSize: 12,
    color: theme.colors.textMuted,
    letterSpacing: 1,
    textTransform: "uppercase",
    marginBottom: 8,
  },
  inputWrap: {
    width: "100%",
    minHeight: 50,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.card,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 16,
    shadowColor: theme.colors.navy,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
  },
  inputWrapError: {
    borderColor: theme.colors.red,
  },
  inputWrapFocused: {
    borderColor: theme.colors.green,
    shadowColor: theme.colors.green,
    shadowOpacity: 0.14,
    shadowRadius: 3,
  },
  input: {
    flex: 1,
    minHeight: 50,
    fontFamily: theme.fontFamily.body,
    fontSize: 15,
    color: theme.colors.text,
  },
  errorText: {
    fontFamily: theme.fontFamily.body,
    fontSize: 12.5,
    color: theme.colors.red,
    marginTop: 8,
  },
});
