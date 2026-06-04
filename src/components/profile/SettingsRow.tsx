// src/components/profile/SettingsRow.tsx

import { ReactNode } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { theme } from "../../theme/theme";
import { AppText } from "../ui/AppText";

type Props = {
  icon: string;
  label: string;
  subtitle?: string;
  value?: string;
  rightElement?: ReactNode;
  onPress?: () => void;
};

export function SettingsRow({
  icon,
  label,
  subtitle,
  value,
  rightElement,
  onPress,
}: Props) {
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      <View style={styles.iconBox}>
        <AppText style={styles.icon}>{icon}</AppText>
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

      {onPress ? <AppText style={styles.chevron}>›</AppText> : null}
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
  iconBox: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: theme.colors.cream2,
    alignItems: "center",
    justifyContent: "center",
  },
  icon: {
    fontSize: 17,
  },
  info: {
    flex: 1,
  },
  label: {
    fontFamily: theme.fontFamily.bodyBold,
    fontSize: 14,
    color: theme.colors.navy,
  },
  subtitle: {
    fontFamily: theme.fontFamily.body,
    fontSize: 11,
    color: theme.colors.textMuted,
    marginTop: 1,
  },
  value: {
    fontFamily: theme.fontFamily.bodyBold,
    fontSize: 12,
    color: theme.colors.orange,
  },
  chevron: {
    fontSize: 20,
    color: theme.colors.textDim,
  },
});
