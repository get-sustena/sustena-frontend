import { Pressable, StyleSheet, View } from "react-native";
import { theme } from "../../../theme/theme";
import { AppText } from "../../ui/AppText";
import { Icon } from "../../ui/Icon";
import type { ProfileOption } from "./profileQuestionOptions";

export function ProfileExperienceCards({ options, value, onSelect }: { options: ProfileOption[]; value: string | null; onSelect: (value: string) => void }) {
  return <View>{options.map((option) => {
    const active = option.value === value;
    return <Pressable key={option.value} onPress={() => onSelect(option.value)} style={({ pressed }) => [styles.card, active && styles.active, pressed && styles.pressed]}>
      <View style={styles.copy}><AppText style={styles.label}>{option.label}</AppText><AppText style={styles.description}>{option.description}</AppText></View>
      <View style={styles.status}>{active ? <Icon name="check" size={16} color={theme.colors.green} /> : null}<View style={styles.dots}>{[1, 2, 3, 4].map((level) => <View key={level} style={[styles.dot, level <= (option.level ?? 0) && styles.dotActive]} />)}</View></View>
    </Pressable>;
  })}</View>;
}

const styles = StyleSheet.create({
  card: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 14, borderWidth: 1.5, borderColor: theme.colors.border, borderRadius: 16, backgroundColor: theme.colors.white, paddingVertical: 15, paddingHorizontal: 18, marginBottom: 10 },
  active: { borderColor: theme.colors.navy, backgroundColor: "rgba(52,182,115,0.08)" },
  copy: { flex: 1, minWidth: 0 },
  label: { fontFamily: theme.fontFamily.bodySemiBold, fontSize: 15, color: theme.colors.text },
  description: { fontFamily: theme.fontFamily.body, fontSize: 12.5, color: theme.colors.textMedium, marginTop: 2 },
  status: { flexDirection: "row", alignItems: "center", gap: 10 },
  dots: { flexDirection: "row", gap: 3 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: theme.colors.border },
  dotActive: { backgroundColor: theme.colors.green },
  pressed: { transform: [{ scale: 0.97 }] },
});
