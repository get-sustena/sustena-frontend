
import { StyleSheet, View } from "react-native";
import { theme } from "../../theme/theme";
import { AppText } from "./AppText";
import { Icon, IconName } from "./Icon";

type ChipVariant = "default" | "soft" | "outline";

type Props = {
  label: string;
  variant?: ChipVariant;
  icon?: IconName;
};

const LABEL_COLORS: Record<ChipVariant, string> = {
  default: theme.colors.textMedium,
  soft: theme.colors.navy3,
  outline: theme.colors.textMuted,
};

export function Chip({ label, variant = "default", icon }: Props) {
  const labelColor = LABEL_COLORS[variant];

  return (
    <View style={[styles.chip, styles[variant]]}>
      {icon ? <Icon name={icon} size={12} color={labelColor} /> : null}

      <AppText style={[styles.label, { color: labelColor }]}>{label}</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: theme.radius.full,
    alignSelf: "flex-start",
  },
  default: {
    backgroundColor: theme.colors.card2,
  },
  soft: {
    backgroundColor: theme.colors.greenDim,
  },
  outline: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  label: {
    fontFamily: theme.fontFamily.mono,
    fontSize: theme.fontSize.xs,
    letterSpacing: 0.3,
  },
});
