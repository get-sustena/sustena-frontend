// src/components/profile/SettingsRow.tsx

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
      <View style={styles.iconBox}>
        <Icon name={icon} size={18} color={theme.colors.navy} />
      </View>

      <View style={styles.info}>
        <AppText style={styles.label}>{label}</AppText>

        {subtitle ? (
          <AppText style={styles.subtitle}>{subtitle}</AppText>
        ) : null}
      </View>

      {rightElement ? (
        rightElement
      ) : value ? (
        <AppText style={styles.value}>{value}</AppText>
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
    gap: theme.spacing.md,
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
    backgroundColor: theme.colors.card2,
    alignItems: "center",
    justifyContent: "center",
  },
  info: {
    flex: 1,
  },
  label: {
    fontFamily: theme.fontFamily.bodySemiBold,
    fontSize: 14,
    color: theme.colors.navy,
  },
  subtitle: {
    fontFamily: theme.fontFamily.body,
    fontSize: 12,
    color: theme.colors.textMedium,
    marginTop: 2,
  },
  value: {
    fontFamily: theme.fontFamily.bodyBold,
    fontSize: 12,
    color: theme.colors.linkGreen,
  },
});
