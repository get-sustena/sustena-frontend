import { Pressable, StyleSheet, View } from "react-native";
import { theme } from "../../../theme/theme";
import { AppText } from "../../ui/AppText";
import { Icon } from "../../ui/Icon";
import type { ProfileOption } from "./profileQuestionOptions";

export function ProfileIconGrid({ options, selected, onToggle }: { options: ProfileOption[]; selected: string[]; onToggle: (value: string) => void }) {
  return <View style={styles.grid}>{options.map((option) => {
    const active = selected.includes(option.value);
    return <Pressable key={option.value} onPress={() => onToggle(option.value)} style={({ pressed }) => [styles.card, active && styles.cardActive, pressed && styles.pressed]}>
      <View style={[styles.iconBox, active && styles.iconBoxActive]}><Icon name={option.icon ?? "profile"} size={20} color={active ? theme.colors.navy3 : theme.colors.navy} /></View>
      <AppText style={styles.label}>{option.label}</AppText>
      {active ? <View style={styles.check}><Icon name="check" size={16} color={theme.colors.green} /></View> : null}
    </Pressable>;
  })}</View>;
}

const styles = StyleSheet.create({
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  card: { position: "relative", width: "48%", flexGrow: 1, minHeight: 125, borderRadius: 18, borderWidth: 1.5, borderColor: theme.colors.border, backgroundColor: theme.colors.white, paddingHorizontal: 16, paddingTop: 18, paddingBottom: 16 },
  cardActive: { borderColor: theme.colors.navy, backgroundColor: "rgba(52,182,115,0.08)" },
  iconBox: { width: 40, height: 40, borderRadius: 12, backgroundColor: theme.colors.card2, alignItems: "center", justifyContent: "center", marginBottom: 14 },
  iconBoxActive: { backgroundColor: theme.colors.white },
  label: { fontFamily: theme.fontFamily.bodySemiBold, fontSize: 14.5, lineHeight: 19, color: theme.colors.text },
  check: { position: "absolute", top: 14, right: 14 },
  pressed: { transform: [{ scale: 0.97 }] },
});
