import { Pressable, StyleSheet, View } from "react-native";
import { theme } from "../../../theme/theme";
import { AppText } from "../../ui/AppText";
import type { ProfileOption } from "./profileQuestionOptions";

export function ProfileChoiceChips({ options, value, onSelect }: { options: ProfileOption[]; value: string | null; onSelect: (value: string) => void }) {
  return <View style={styles.row}>{options.map((option) => {
    const active = option.value === value;
    return <Pressable key={option.value} onPress={() => onSelect(option.value)} style={({ pressed }) => [styles.chip, active && styles.active, pressed && styles.pressed]}><AppText style={styles.label}>{option.label}</AppText></Pressable>;
  })}</View>;
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: { paddingVertical: 11, paddingHorizontal: 18, borderRadius: 999, borderWidth: 1.5, borderColor: theme.colors.border, backgroundColor: theme.colors.white },
  active: { borderColor: theme.colors.navy, backgroundColor: "rgba(52,182,115,0.08)" },
  label: { fontFamily: theme.fontFamily.bodySemiBold, fontSize: 13.5, color: theme.colors.text },
  pressed: { transform: [{ scale: 0.97 }] },
});
