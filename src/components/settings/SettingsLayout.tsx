import type { ReactNode } from "react";
import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import { theme } from "../../theme/theme";
import { AppText } from "../ui/AppText";

// v6.9.2's .sv2-h: the big section title over each card.
export function SettingsSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View>
      <AppText role="heading" style={styles.title}>{title}</AppText>
      {children}
    </View>
  );
}

// v6.9.2's .sv2-card: a white card of rows.
export function SettingsCard({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  title: {
    marginTop: 28,
    marginHorizontal: 4,
    marginBottom: 12,
    fontFamily: theme.fontFamily.display,
    fontSize: 21,
    lineHeight: 21 * 1.1,
    letterSpacing: 21 * -0.02,
    color: theme.colors.navy,
  },
  card: {
    paddingVertical: 4,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 0.75,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
});
