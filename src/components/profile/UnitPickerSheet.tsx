import { Pressable, StyleSheet, View } from "react-native";
import type { UnitMode } from "../../data/recipes";
import { theme } from "../../theme/theme";
import { AppText } from "../ui/AppText";
import { Icon } from "../ui/Icon";

export function UnitPickerSheet({ value, onSelect }: { value: UnitMode; onSelect: (value: UnitMode) => void }) {
  const options: { value: UnitMode; label: string }[] = [
    { value: "metric", label: "Metric" },
    { value: "imperial", label: "Imperial" },
    { value: "cups", label: "Nigerian Market Units" },
  ];
  return (
    <View style={styles.content}>
      <AppText style={styles.title}>Default Units</AppText>
      {options.map((option) => (
        <Pressable key={option.value} onPress={() => onSelect(option.value)} style={styles.option}>
          <AppText style={[styles.label, option.value === value && styles.selected]}>{option.label}</AppText>
          {option.value === value ? <Icon name="check" size={18} color={theme.colors.green} /> : null}
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: 24 },
  title: { marginBottom: 14, fontFamily: theme.fontFamily.display, fontSize: 19, color: theme.colors.text },
  option: { minHeight: 52, paddingHorizontal: 4, flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  label: { fontFamily: theme.fontFamily.bodyMedium, fontSize: 15, color: theme.colors.text },
  selected: { fontFamily: theme.fontFamily.bodyBold, color: theme.colors.navy },
});
