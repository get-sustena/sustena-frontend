import { ReactNode } from "react";
import { StyleSheet, View } from "react-native";
import { theme } from "../../theme/theme";
import { SettingsPressable } from "../settings/SettingsPressable";
import { AppText } from "../ui/AppText";
import { Icon, IconName } from "../ui/Icon";

type Props = {
  icon: IconName;
  label: string;
  subtitle?: string;
  // A switch in place of the chevron; rows with one aren't tappable.
  rightElement?: ReactNode;
  onPress?: () => void;
  showDivider?: boolean;
  danger?: boolean;
};

// v6.9.2's .sv2-row: a brand-green icon, a bold label and a hairline under it.
export function SettingsRow({ icon, label, subtitle, rightElement, onPress, showDivider = true, danger = false }: Props) {
  const content = (
    <>
      <Icon name={icon} size={18} color={danger ? theme.colors.red : theme.colors.navy3} />
      <View style={styles.main}>
        <AppText style={[styles.label, danger && styles.danger]}>{label}</AppText>
        {subtitle ? <AppText style={styles.subtitle}>{subtitle}</AppText> : null}
      </View>
      {rightElement ?? (onPress ? <Icon name="chevronRight" size={16} color={theme.colors.textMuted} /> : null)}
    </>
  );

  if (!onPress) {
    return <View style={[styles.row, !showDivider && styles.last]}>{content}</View>;
  }

  return (
    <SettingsPressable feedback="highlight" accessibilityRole="button" onPress={onPress} style={[styles.row, !showDivider && styles.last]}>
      {content}
    </SettingsPressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    minHeight: 54,
    paddingVertical: 10,
    borderBottomWidth: 0.75,
    borderBottomColor: theme.colors.border,
  },
  last: { borderBottomWidth: 0 },
  main: { flex: 1, minWidth: 0 },
  label: { fontFamily: theme.fontFamily.bodyBold, fontSize: 14.5, lineHeight: 14.5 * 1.3, color: theme.colors.navy },
  danger: { color: theme.colors.red },
  subtitle: { marginTop: 2, fontFamily: theme.fontFamily.body, fontSize: 12, lineHeight: 12 * 1.35, color: theme.colors.textMedium },
});
