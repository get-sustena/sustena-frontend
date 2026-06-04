// src/components/recipe/UnitToggle.tsx

import { Pressable, StyleSheet, View } from "react-native";
import { UnitMode } from "../../data/recipes";
import { theme } from "../../theme/theme";
import { AppText } from "../ui/AppText";

type UnitOption = {
  label: string;
  value: UnitMode;
};

const UNIT_OPTIONS: UnitOption[] = [
  {
    label: "🌍 Metric",
    value: "metric",
  },
  {
    label: "☕ Cups/Tbsp",
    value: "cups",
  },
  {
    label: "🇬🇧 Imperial",
    value: "imperial",
  },
];

type Props = {
  value: UnitMode;
  onChange: (value: UnitMode) => void;
};

export function UnitToggle({ value, onChange }: Props) {
  return (
    <View style={styles.container}>
      <AppText style={styles.title}>Measurement Units</AppText>

      <View style={styles.row}>
        {UNIT_OPTIONS.map((option) => {
          const isActive = option.value === value;

          return (
            <Pressable
              key={option.value}
              onPress={() => onChange(option.value)}
              style={({ pressed }) => [
                styles.button,
                isActive && styles.activeButton,
                pressed && styles.pressed,
              ]}
            >
              <AppText
                style={[styles.buttonText, isActive && styles.activeButtonText]}
              >
                {option.label}
              </AppText>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: theme.colors.card,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.lg,
  },
  title: {
    fontFamily: theme.fontFamily.bodyBold,
    fontSize: 12,
    color: theme.colors.textMuted,
    letterSpacing: 1,
    textTransform: "uppercase",
    marginBottom: theme.spacing.md,
  },
  row: {
    flexDirection: "row",
    gap: theme.spacing.sm,
  },
  button: {
    flex: 1,
    minHeight: 42,
    borderRadius: theme.radius.sm,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: theme.spacing.sm,
  },
  activeButton: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.primaryDim,
  },
  pressed: {
    opacity: 0.8,
    transform: [{ scale: 0.98 }],
  },
  buttonText: {
    fontFamily: theme.fontFamily.bodyBold,
    fontSize: 11,
    color: theme.colors.textMuted,
    textAlign: "center",
  },
  activeButtonText: {
    color: theme.colors.primary,
  },
});
