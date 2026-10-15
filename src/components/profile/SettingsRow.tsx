
import { ReactNode } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { theme } from "../../theme/theme";
import { AppText } from "../ui/AppText";
import { Icon, IconName } from "../ui/Icon";

type Props = {
  icon: IconName;
  label: string;
  subtitle?: string;
  value?: string;
  rightElement?: ReactNode;
  onPress?: () => void;
  showDivider?: boolean;
  showChevron?: boolean;
  iconBackground?: string;
  iconColor?: string;
  valueColor?: string;
  labelColor?: string;
  // Shown after the label, like v6.9's "Not confirmed" pill.
  labelAccessory?: ReactNode;
};

export function SettingsRow({
  icon,
  label,
  subtitle,
  value,
  rightElement,
  onPress,
  showDivider = true,
  showChevron = true,
  iconBackground = "#EEF2E7",
  iconColor = "#17291E",
  valueColor = "#279a5f",
  labelColor,
  labelAccessory,
}: Props) {
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      style={({ pressed }) => [
        styles.row,
        !showDivider && styles.rowWithoutDivider,
        pressed && styles.pressed,
      ]}
      accessibilityRole={onPress ? "button" : undefined}
    >
      <View style={[styles.iconBox, { backgroundColor: iconBackground }]}>
        <Icon name={icon} size={18} color={iconColor} />
      </View>

      <View style={styles.info}>
        <View style={styles.labelRow}>
          <AppText style={[styles.label, labelColor ? { color: labelColor } : null]}>{label}</AppText>
          {labelAccessory}
        </View>

        {subtitle ? (
          <AppText style={styles.subtitle}>{subtitle}</AppText>
        ) : null}
      </View>

      {rightElement ? (
        rightElement
      ) : value ? (
        <AppText style={[styles.value, { color: valueColor }]}>{value}</AppText>
      ) : null}

      {onPress && showChevron ? (
        <Icon name="chevronRight" size={16} color={theme.colors.textDim} />
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  pressed: {
    opacity: 0.75,
  },
  rowWithoutDivider: {
    borderBottomWidth: 0,
  },
  iconBox: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  info: {
    flex: 1,
  },
  labelRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 6,
  },
  // v6.8 renders settings row labels at Inter Medium ([data-label]).
  label: {
    fontFamily: theme.fontFamily.bodyMedium,
    fontSize: 14,
    color: theme.colors.navy,
  },
  subtitle: {
    fontFamily: theme.fontFamily.body,
    fontSize: 12,
    color: "#5C6459",
    marginTop: 2,
  },
  value: {
    fontFamily: theme.fontFamily.bodyBold,
    fontSize: 12,
  },
});
