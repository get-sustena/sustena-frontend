import { ReactNode } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { theme } from "../../theme/theme";
import { AppText } from "../ui/AppText";
import { Icon } from "../ui/Icon";

// v6.9's tick row (.co-check-row.legal-tick): a box and its words.
export function LegalCheckRow({ checked, onToggle, children }: { checked: boolean; onToggle: () => void; children: ReactNode }) {
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
      onPress={onToggle}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      <View style={[styles.box, checked && styles.boxChecked]}>
        {checked ? <Icon name="check" size={13} color={theme.colors.white} strokeWidth={3} /> : null}
      </View>
      <AppText style={styles.label}>{children}</AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { minHeight: 44, marginTop: 14, flexDirection: "row", alignItems: "flex-start", gap: 12 },
  pressed: { backgroundColor: theme.colors.control },
  box: {
    width: 22,
    height: 22,
    marginTop: 1,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: theme.colors.lineStrong,
    alignItems: "center",
    justifyContent: "center",
  },
  boxChecked: { borderColor: theme.colors.navy3, backgroundColor: theme.colors.navy3 },
  label: { flex: 1, fontFamily: theme.fontFamily.body, fontSize: 14, lineHeight: 20.3, color: theme.colors.navy },
});
