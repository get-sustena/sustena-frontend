import { Pressable, StyleSheet, View } from "react-native";
import { closeSheet } from "../../../store/uiStore";
import { theme } from "../../../theme/theme";
import { AppText } from "../../ui/AppText";

export type RecipeEditorAction = {
  label: string;
  danger?: boolean;
  disabled?: boolean;
  onPress: () => void;
};

export function RecipeEditorActionSheet({
  actions,
}: {
  actions: RecipeEditorAction[];
}) {
  return (
    <View style={styles.sheet}>
      {actions.map((action) => (
        <Pressable
          key={action.label}
          accessibilityRole="button"
          disabled={action.disabled}
          onPress={() => {
            closeSheet();
            action.onPress();
          }}
          style={({ pressed }) => [
            styles.row,
            pressed && styles.pressed,
            action.disabled && styles.disabled,
          ]}
        >
          <AppText style={[styles.label, action.danger && styles.danger]}>
            {action.label}
          </AppText>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  sheet: { paddingBottom: 24 },
  row: {
    minHeight: 52,
    paddingHorizontal: 4,
    justifyContent: "center",
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  label: {
    fontFamily: theme.fontFamily.body,
    fontSize: 14.5,
    color: theme.colors.text,
  },
  danger: { color: theme.colors.red },
  pressed: { opacity: 0.65 },
  disabled: { opacity: 0.35 },
});
