import { Pressable, StyleSheet, View } from "react-native";
import { theme } from "../../../theme/theme";
import { AppText } from "../../ui/AppText";
import type { ProfileOption } from "./profileQuestionOptions";

export function ProfileRadioList({ options, value, onSelect }: { options: ProfileOption[]; value: string | null; onSelect: (value: string) => void }) {
  return <View>{options.map((option, index) => {
    const active = option.value === value;
    return <Pressable key={option.value} onPress={() => onSelect(option.value)} style={({ pressed }) => [styles.row, index === options.length - 1 && styles.lastRow, pressed && styles.pressed]}>
      <View style={[styles.radio, active && styles.radioActive]}>{active ? <View style={styles.radioDot} /> : null}</View>
      <AppText style={styles.label}>{option.label}</AppText>
    </Pressable>;
  })}</View>;
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 14, paddingVertical: 16, paddingHorizontal: 4, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  lastRow: { borderBottomWidth: 0 },
  radio: { width: 21, height: 21, borderRadius: 11, borderWidth: 1.5, borderColor: theme.colors.border, alignItems: "center", justifyContent: "center" },
  radioActive: { borderColor: theme.colors.green, backgroundColor: theme.colors.green },
  radioDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: theme.colors.white },
  label: { fontFamily: theme.fontFamily.body, fontSize: 15.5, color: theme.colors.text },
  pressed: { opacity: 0.7 },
});
