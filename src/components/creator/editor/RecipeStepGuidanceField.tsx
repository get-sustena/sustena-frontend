import { Pressable, StyleSheet, TextInput, View } from "react-native";
import { theme } from "../../../theme/theme";
import { AppText } from "../../ui/AppText";
import { Icon } from "../../ui/Icon";

export function RecipeStepGuidanceField({
  kind,
  value,
  onChange,
  onClose,
}: {
  kind: "mistake" | "tip";
  value: string;
  onChange: (value: string) => void;
  onClose: () => void;
}) {
  const mistake = kind === "mistake";
  const color = mistake ? theme.colors.gold : theme.colors.navy3;

  return (
    <View style={[styles.card, mistake ? styles.mistakeCard : styles.tipCard]}>
      <View style={styles.header}>
        <View style={styles.heading}>
          <Icon
            name={mistake ? "alertTriangle" : "bulb"}
            size={15}
            color={color}
            strokeWidth={2}
          />
          <AppText style={[styles.title, { color }]}>
            {mistake ? "Common mistake" : "Tip"}
          </AppText>
        </View>
        <Pressable
          accessibilityLabel={`Close ${mistake ? "common mistake" : "tip"}`}
          hitSlop={8}
          onPress={onClose}
          style={styles.closeButton}
        >
          <Icon name="close" size={12} color={color} strokeWidth={2} />
        </Pressable>
      </View>

      <TextInput
        value={value}
        onChangeText={onChange}
        maxLength={2000}
        multiline
        placeholder={
          mistake
            ? "e.g. Do not cook the rice until fully soft at this stage."
            : "e.g. Cover the pot while the rice cooks."
        }
        placeholderTextColor={theme.colors.textMuted}
        textAlignVertical="top"
        style={styles.input}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    paddingHorizontal: 13,
    paddingVertical: 12,
    borderWidth: 1,
    borderRadius: 14,
  },
  mistakeCard: {
    borderColor: "rgba(198,138,46,0.25)",
    backgroundColor: "rgba(198,138,46,0.08)",
  },
  tipCard: {
    borderColor: "rgba(31,112,72,0.25)",
    backgroundColor: "rgba(31,112,72,0.08)",
  },
  header: {
    marginBottom: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  heading: { flexDirection: "row", alignItems: "center", gap: 7 },
  title: {
    fontFamily: theme.fontFamily.bodyBold,
    fontSize: 13,
  },
  closeButton: {
    width: 26,
    height: 26,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
  },
  input: {
    minHeight: 45,
    padding: 0,
    fontFamily: theme.fontFamily.body,
    fontSize: 13.5,
    lineHeight: 19,
    color: theme.colors.text,
    backgroundColor: "transparent",
  },
});
