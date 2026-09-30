
import * as Haptics from "expo-haptics";
import { Pressable, StyleSheet, View } from "react-native";
import { usePreferencesStore } from "../../store/preferencesStore";
import { theme } from "../../theme/theme";
import { AppText } from "../ui/AppText";

type Props = {
  value: number;
  min?: number;
  max?: number;
  onChange: (value: number) => void;
};

export function ServingSizeControl({
  value,
  min = 1,
  max = 25,
  onChange,
}: Props) {
  const hapticsEnabled = usePreferencesStore((state) => state.hapticsEnabled);

  function updateServing(nextValue: number) {
    const boundedValue = Math.max(min, Math.min(max, nextValue));

    if (boundedValue === value) {
      return;
    }

    if (hapticsEnabled) {
      void Haptics.selectionAsync();
    }
    onChange(boundedValue);
  }

  return (
    <View style={styles.container}>
      <AppText style={styles.title}>Serving Size</AppText>

      <View style={styles.row}>
        <Pressable
          onPress={() => updateServing(value - 1)}
          style={({ pressed }) => [
            styles.controlButton,
            pressed && styles.pressed,
            value <= min && styles.disabled,
          ]}
        >
          <AppText style={styles.controlButtonText}>−</AppText>
        </Pressable>

        <View style={styles.display}>
          <AppText style={styles.number}>{value}</AppText>
          <AppText style={styles.label}>
            {value === 1 ? "person" : "people"}
          </AppText>
        </View>

        <Pressable
          onPress={() => updateServing(value + 1)}
          style={({ pressed }) => [
            styles.controlButton,
            pressed && styles.pressed,
            value >= max && styles.disabled,
          ]}
        >
          <AppText style={styles.controlButtonText}>+</AppText>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.lg,
  },
  title: {
    fontFamily: theme.fontFamily.bodyBold,
    fontSize: 10,
    color: theme.colors.textMuted,
    letterSpacing: 1.5,
    textTransform: "uppercase",
    marginBottom: theme.spacing.md,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.lg,
  },
  controlButton: {
    width: 42,
    height: 42,
    borderRadius: theme.radius.sm,
    backgroundColor: theme.colors.cream2,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  controlButtonText: {
    fontFamily: theme.fontFamily.bodyBold,
    fontSize: 22,
    color: theme.colors.navy,
  },
  display: {
    flex: 1,
    alignItems: "center",
  },
  number: {
    fontFamily: theme.fontFamily.display,
    fontSize: 40,
    color: theme.colors.navy,
    lineHeight: 44,
  },
  label: {
    fontFamily: theme.fontFamily.bodyMedium,
    fontSize: 11,
    color: theme.colors.textMuted,
  },
  pressed: {
    opacity: 0.75,
    transform: [{ scale: 0.96 }],
  },
  disabled: {
    opacity: 0.45,
  },
});
