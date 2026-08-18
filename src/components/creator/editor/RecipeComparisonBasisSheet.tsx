import { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { closeSheet } from "../../../store/uiStore";
import { theme } from "../../../theme/theme";
import { AppText } from "../../ui/AppText";
import { Icon } from "../../ui/Icon";

type Basis = "meal" | "snack";

export function RecipeComparisonBasisSheet({
  value,
  onApply,
}: {
  value: Basis;
  onApply: (value: Basis) => void;
}) {
  const [selected, setSelected] = useState<Basis>(value);

  function apply() {
    onApply(selected);
    closeSheet();
  }

  return (
    <View style={styles.sheet}>
      <AppText style={styles.title}>Change comparison basis</AppText>
      <AppText style={styles.copy}>
        Choose what this recipe should be compared with when affordability is
        calculated per serving.
      </AppText>
      {[
        { value: "meal" as const, label: "Meal or recipe" },
        { value: "snack" as const, label: "Snack or drink" },
      ].map((option) => (
        <Pressable
          key={option.value}
          onPress={() => setSelected(option.value)}
          style={styles.option}
        >
          <AppText style={styles.optionText}>{option.label}</AppText>
          <View style={[styles.radio, selected === option.value && styles.radioSelected]}>
            {selected === option.value ? (
              <Icon name="check" size={13} color={theme.colors.onDark} />
            ) : null}
          </View>
        </Pressable>
      ))}
      <Pressable onPress={apply} style={styles.applyButton}>
        <AppText style={styles.applyText}>Apply</AppText>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  sheet: { paddingBottom: 20 },
  title: { fontFamily: theme.fontFamily.display, fontSize: 20, color: theme.colors.navy },
  copy: { marginTop: 5, marginBottom: 12, fontSize: 12, lineHeight: 18, color: theme.colors.textMuted },
  option: { minHeight: 54, flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  optionText: { fontFamily: theme.fontFamily.bodyMedium, fontSize: 13.5, color: theme.colors.text },
  radio: { width: 23, height: 23, alignItems: "center", justifyContent: "center", borderWidth: 1.5, borderColor: theme.colors.border, borderRadius: 12 },
  radioSelected: { borderColor: theme.colors.navy, backgroundColor: theme.colors.navy },
  applyButton: { minHeight: 48, marginTop: 14, alignItems: "center", justifyContent: "center", borderRadius: 999, backgroundColor: theme.colors.navy },
  applyText: { fontFamily: theme.fontFamily.bodyBold, fontSize: 14, color: theme.colors.onDark },
});
