import { Pressable, StyleSheet } from "react-native";
import { theme } from "../../theme/theme";
import { AppText } from "./AppText";

type Props = {
  label: string;
  active?: boolean;
  onPress?: () => void;
};

export function FilterChip({ label, active = false, onPress }: Props) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.chip,
        active && styles.activeChip,
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
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: theme.radius.full,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.card,
  },
  activeChip: {
    borderColor: theme.colors.navy,
    backgroundColor: theme.colors.navy,
  },
  pressed: {
    opacity: 0.78,
    transform: [{ scale: 0.97 }],
  },
  label: {
    fontFamily: theme.fontFamily.bodySemiBold,
    fontSize: 13,
    color: theme.colors.text,
  },
  activeLabel: {
    color: theme.colors.onDark,
  },
});
