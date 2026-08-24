import { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { theme } from "../../theme/theme";
import { AppText } from "../ui/AppText";
import { Icon } from "../ui/Icon";

export function ServingSizeSheet({ value, onSave }: { value: number; onSave: (value: number) => void }) {
  const [draft, setDraft] = useState(value);
  return (
    <View style={styles.content}>
      <AppText style={styles.title}>Default Serving Size</AppText>
      <View style={styles.control}>
        <Pressable onPress={() => setDraft((current) => Math.max(1, current - 1))} style={styles.adjust}><Icon name="minus" size={20} /></Pressable>
        <View style={styles.valueWrap}><AppText style={styles.value}>{draft}</AppText><AppText style={styles.unit}>{draft === 1 ? "person" : "people"}</AppText></View>
        <Pressable onPress={() => setDraft((current) => Math.min(25, current + 1))} style={styles.adjust}><Icon name="plus" size={20} /></Pressable>
      </View>
      <Pressable onPress={() => onSave(draft)} style={styles.save}><AppText style={styles.saveText}>Save</AppText></Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: 24 },
  title: { marginBottom: 14, fontFamily: theme.fontFamily.display, fontSize: 19, color: theme.colors.text },
  control: { flexDirection: "row", alignItems: "center", gap: 16, marginBottom: 20 },
  adjust: { width: 48, height: 48, borderRadius: 12, borderWidth: 1, borderColor: theme.colors.border, backgroundColor: theme.colors.card2, alignItems: "center", justifyContent: "center" },
  valueWrap: { flex: 1, flexDirection: "row", alignItems: "baseline", justifyContent: "center", gap: 6 },
  value: { fontFamily: theme.fontFamily.display, fontSize: 32, color: theme.colors.text },
  unit: { fontSize: 13, color: theme.colors.textMedium },
  save: { minHeight: 48, borderRadius: 999, backgroundColor: theme.colors.navy, alignItems: "center", justifyContent: "center" },
  saveText: { fontFamily: theme.fontFamily.bodySemiBold, fontSize: 15, color: theme.colors.onDark },
});
