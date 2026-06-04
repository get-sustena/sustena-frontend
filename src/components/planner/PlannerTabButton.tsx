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

export function PlannerTabButton({ label, value, active, onPress }: Props) {
  return (
    <Pressable
      onPress={() => onPress(value)}
      style={({ pressed }) => [
        styles.button,
        active && styles.activeButton,
        pressed && styles.pressed,
      ]}
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
    minHeight: 38,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
  },
  activeButton: {
    backgroundColor: theme.colors.navy,
  },
  pressed: {
    opacity: 0.82,
    transform: [{ scale: 0.98 }],
  },
  label: {
    fontFamily: theme.fontFamily.bodyBold,
    fontSize: 10,
    color: theme.colors.textMuted,
    textAlign: "center",
  },
  activeLabel: {
    color: theme.colors.onDark,
  },
});
