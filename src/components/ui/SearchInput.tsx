import { StyleSheet, TextInput, View } from "react-native";
import { theme } from "../../theme/theme";
import { AppText } from "./AppText";

type Props = {
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
};

export function SearchInput({
  value,
  onChangeText,
  placeholder = "Search...",
}: Props) {
  return (
    <View style={styles.container}>
      <AppText style={styles.icon}>🔍</AppText>

      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={theme.colors.textDim}
        style={styles.input}
        autoCorrect={false}
        autoCapitalize="none"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 20,
    marginBottom: theme.spacing.lg,
    backgroundColor: theme.colors.surface,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    borderRadius: 14,
    paddingHorizontal: theme.spacing.lg,
    minHeight: 50,
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.md,
  },
  icon: {
    fontSize: 15,
    color: theme.colors.textMuted,
  },
  input: {
    flex: 1,
    fontFamily: theme.fontFamily.body,
    fontSize: 14,
    color: theme.colors.text,
    paddingVertical: 0,
  },
});
