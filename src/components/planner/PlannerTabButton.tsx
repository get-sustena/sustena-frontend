import { Pressable, StyleSheet } from "react-native";
import { theme } from "../../theme/theme";
import { PlannerTab } from "../../types/planner";
import { AppText } from "../ui/AppText";

type Props = {
  label: string;
  value: PlannerTab;
  active: boolean;
  onPress: (value: PlannerTab) => void;
};

export function PlannerTabButton({
  label,
  value,
  active,
  onPress,
}: Props) {
  return (
    <Pressable
      onPress={() => onPress(value)}
      style={({ pressed }) => [
        styles.button,
        pressed && styles.pressed,
      ]}
      accessibilityRole="tab"
      accessibilityState={{ selected: active }}
    >
      <AppText style={[styles.label, active && styles.activeLabel]}>
        {label}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    flex: 1,
    minHeight: 42,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
    zIndex: 1,
  },
  pressed: {
    opacity: 0.7,
  },
  label: {
    fontFamily: theme.fontFamily.bodyMedium,
    fontSize: 13.5,
    color: theme.colors.textMedium,
    textAlign: "center",
  },
  activeLabel: {
    fontFamily: theme.fontFamily.bodySemiBold,
    color: theme.colors.text,
  },
});
