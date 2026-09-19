import { Pressable, StyleSheet } from "react-native";
import { theme } from "../../../theme/theme";
import { AppText } from "../../ui/AppText";
import { Icon } from "../../ui/Icon";

export function RecipeStepGuidanceButton({
  kind,
  full,
  onPress,
}: {
  kind: "mistake" | "tip";
  full?: boolean;
  onPress: () => void;
}) {
  const mistake = kind === "mistake";
  const color = mistake ? theme.colors.gold : theme.colors.navy3;

  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.button,
        full && styles.full,
        mistake ? styles.mistake : styles.tip,
      ]}
    >
      <Icon
        name={mistake ? "alertTriangle" : "bulb"}
        size={15}
        color={color}
        strokeWidth={2}
      />
      <AppText style={styles.text}>
        {mistake ? "Common mistake" : "Helpful tip"}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 42,
    flex: 1,
    paddingHorizontal: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderWidth: 1,
    borderRadius: 12,
  },
  full: { width: "100%", flex: 0 },
  mistake: {
    borderColor: theme.colors.border,
    backgroundColor: "transparent",
  },
  tip: {
    borderColor: theme.colors.border,
    backgroundColor: "transparent",
  },
  text: {
    flexShrink: 1,
    textAlign: "center",
    fontFamily: theme.fontFamily.bodySemiBold,
    fontSize: 11.5,
    lineHeight: 15,
    color: theme.colors.text,
  },
});
