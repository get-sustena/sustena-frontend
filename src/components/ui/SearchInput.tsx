import { StyleSheet, TextInput, View } from "react-native";
import { theme } from "../../theme/theme";
import { Icon } from "./Icon";

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
      <Icon name="discover" size={18} color={theme.colors.textMedium} />

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
    backgroundColor: theme.colors.card,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  input: {
    flex: 1,
    fontFamily: theme.fontFamily.body,
    fontSize: 15,
    color: theme.colors.text,
    paddingVertical: 0,
  },
});
