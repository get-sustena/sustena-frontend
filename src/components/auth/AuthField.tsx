
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
  marginBottom?: number;
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
  marginBottom,
  error,
}: Props) {
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const isPasswordField = Boolean(secureTextEntry);

  return (
    <View style={[styles.field, marginBottom !== undefined && { marginBottom }]}>
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
          placeholderTextColor={theme.colors.textMuted}
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
    fontFamily: theme.fontFamily.bodySemiBold,
    fontSize: 12,
    color: theme.colors.textMuted,
    letterSpacing: 1.2,
    textTransform: "uppercase",
    marginBottom: 8,
  },
  inputWrap: {
    width: "100%",
    minHeight: 50,
    borderRadius: 14,
    borderWidth: 0.75,
    borderColor: "#E1E1E1",
    backgroundColor: "#FFFFFF",
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 16,
  },
  inputWrapError: {
    borderColor: theme.colors.red,
  },
  inputWrapFocused: {
    borderColor: "#909090",
  },
  input: {
    flex: 1,
    minHeight: 50,
    fontFamily: theme.fontFamily.body,
    fontSize: 15,
    color: theme.colors.navy,
  },
  errorText: {
    fontFamily: theme.fontFamily.body,
    fontSize: 12.5,
    color: theme.colors.red,
    marginTop: 8,
  },
});
