import { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { theme } from "../../theme/theme";
import { AppText } from "../ui/AppText";
import { ServingsStepper } from "../ui/ServingsStepper";

export function ServingSizeSheet({ value, onSave }: { value: number; onSave: (value: number) => void }) {
  const [draft, setDraft] = useState(value);
  return (
    <View style={styles.content}>
      <AppText style={styles.title}>Default Serving Size</AppText>
      <ServingsStepper
        value={draft}
        onChange={setDraft}
        unit={(servings) => (servings === 1 ? "person" : "people")}
        style={styles.control}
      />
      <Pressable onPress={() => onSave(draft)} style={styles.save}><AppText style={styles.saveText}>Save</AppText></Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: 24 },
  title: { marginBottom: 14, fontFamily: theme.fontFamily.display, fontSize: 19, color: theme.colors.text },
  control: { marginBottom: 20 },
  save: { minHeight: 48, borderRadius: 999, backgroundColor: theme.colors.navy, alignItems: "center", justifyContent: "center" },
  saveText: { fontFamily: theme.fontFamily.bodySemiBold, fontSize: 15, color: theme.colors.onDark },
});
