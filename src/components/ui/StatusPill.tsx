// src/components/ui/StatusPill.tsx
// Colored status indicator (dot + label) — e.g. sync state, budget status,
// stock/availability badges.

import { StyleSheet, View } from "react-native";
import { theme } from "../../theme/theme";
import { AppText } from "./AppText";

type StatusPillTone = "success" | "warning" | "danger" | "neutral";

type Props = {
  label: string;
  tone?: StatusPillTone;
};

const TONE_COLORS: Record<
  StatusPillTone,
  { bg: string; dot: string; text: string }
> = {
  success: {
    bg: theme.colors.greenDim,
    dot: theme.colors.green,
    text: theme.colors.navy3,
  },
  warning: {
    bg: theme.colors.orangeDim,
    dot: theme.colors.gold,
    text: theme.colors.orange2,
  },
  danger: {
    bg: "rgba(192,57,46,0.12)",
    dot: theme.colors.red,
    text: theme.colors.red,
  },
  neutral: {
    bg: theme.colors.card2,
    dot: theme.colors.textMuted,
    text: theme.colors.textMedium,
  },
};

export function StatusPill({ label, tone = "neutral" }: Props) {
  const colors = TONE_COLORS[tone];

  return (
    <View style={[styles.pill, { backgroundColor: colors.bg }]}>
      <View style={[styles.dot, { backgroundColor: colors.dot }]} />
      <AppText style={[styles.label, { color: colors.text }]}>
        {label}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: theme.radius.full,
    alignSelf: "flex-start",
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  label: {
    fontFamily: theme.fontFamily.monoMedium,
    fontSize: theme.fontSize.xs,
    letterSpacing: 0.3,
    textTransform: "uppercase",
  },
});
