import { useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
} from "react-native";
import { theme } from "../../theme/theme";
import { AppText } from "../ui/AppText";
import { Icon } from "../ui/Icon";

export type CreatorRecipeFilters = {
  categories: string[];
  cuisines: string[];
  difficulties: string[];
  affordability: string[];
};

export const EMPTY_CREATOR_RECIPE_FILTERS: CreatorRecipeFilters = {
  categories: [],
  cuisines: [],
  difficulties: [],
  affordability: [],
};

export function CreatorProfileFiltersSheet({ initialValue, categories, cuisines, resultCount, onApply }: { initialValue: CreatorRecipeFilters; categories: string[]; cuisines: string[]; resultCount: (value: CreatorRecipeFilters) => number; onApply: (value: CreatorRecipeFilters) => void }) {
  const { height } = useWindowDimensions();
  const [value, setValue] = useState(initialValue);

  function toggle(key: keyof CreatorRecipeFilters, item: string) {
    const selected = value[key];
    setValue({ ...value, [key]: selected.includes(item) ? selected.filter((entry) => entry !== item) : [...selected, item] });
  }
  return (
    <ScrollView
      style={[styles.scroll, { maxHeight: height * 0.62 }]}
      contentContainerStyle={styles.sheet}
      keyboardShouldPersistTaps="handled"
      nestedScrollEnabled
      showsVerticalScrollIndicator={false}
    >
      <AppText style={styles.title}>Filter recipes</AppText>
      <FilterGroup title="Recipe Category" values={categories} selected={value.categories} onToggle={(item) => toggle("categories", item)} />
      <FilterGroup title="Cuisine / Tribe" values={cuisines} selected={value.cuisines} onToggle={(item) => toggle("cuisines", item)} />
      <FilterGroup title="Difficulty" values={["Easy", "Medium", "Hard"]} selected={value.difficulties} onToggle={(item) => toggle("difficulties", item)} />
      <FilterGroup title="Affordability per serving" values={["Low budget", "Moderate budget", "Expensive"]} selected={value.affordability} onToggle={(item) => toggle("affordability", item)} />
      <View style={styles.actions}>
        <Pressable onPress={() => setValue(EMPTY_CREATOR_RECIPE_FILTERS)} style={styles.clear}><AppText style={styles.clearText}>Clear filters</AppText></Pressable>
        <Pressable onPress={() => onApply(value)} style={styles.apply}><AppText style={styles.applyText}>Show {resultCount(value)} recipes</AppText></Pressable>
      </View>
    </ScrollView>
  );
}

function FilterGroup({ title, values, selected, onToggle }: { title: string; values: string[]; selected: string[]; onToggle: (value: string) => void }) {
  if (!values.length) return null;
  return (
    <View style={styles.group}>
      <AppText style={styles.groupTitle}>{title}</AppText>
      <View style={styles.chips}>
        {values.map((value) => {
          const active = selected.includes(value);
          return <Pressable key={value} onPress={() => onToggle(value)} style={[styles.chip, active && styles.chipActive]}>{active ? <Icon name="check" size={12} color="#FBFBF7" strokeWidth={3} /> : null}<AppText style={[styles.chipText, active && styles.chipTextActive]}>{value}</AppText></Pressable>;
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: { flexGrow: 0 },
  sheet: { paddingBottom: 18 },
  title: { marginBottom: 14, fontFamily: theme.fontFamily.display, fontSize: 19, color: "#17291E" },
  group: { marginBottom: 16 },
  groupTitle: { marginBottom: 8, fontFamily: theme.fontFamily.body, fontSize: 11.5, letterSpacing: 0.92, textTransform: "uppercase", color: theme.colors.textMuted },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 7 },
  chip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, borderWidth: 1, borderColor: "#E1E1E1", backgroundColor: "#EEF2E7", flexDirection: "row", alignItems: "center", gap: 5 },
  chipActive: { borderColor: "#17291E", backgroundColor: "#17291E" },
  chipText: { fontFamily: theme.fontFamily.bodySemiBold, fontSize: 12.5, color: "#1f7048" },
  chipTextActive: { color: "#FBFBF7" },
  actions: { flexDirection: "row", gap: 10, marginTop: 4 },
  clear: { flex: 1, alignItems: "center", paddingVertical: 13, borderRadius: 999, borderWidth: 1, borderColor: "#E1E1E1", backgroundColor: "#FFFFFF" },
  clearText: { fontFamily: theme.fontFamily.bodySemiBold, fontSize: 14, color: "#17291E" },
  apply: { flex: 1, alignItems: "center", paddingVertical: 13, borderRadius: 999, backgroundColor: "#17291E" },
  applyText: { fontFamily: theme.fontFamily.bodySemiBold, fontSize: 14, color: "#FBFBF7" },
});
