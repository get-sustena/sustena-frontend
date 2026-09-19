import { Pressable, StyleSheet, View } from "react-native";
import { theme } from "../../theme/theme";
import { AppText } from "../ui/AppText";

export type CreatorRecipeSort = "newest" | "top_rated";

export function SortCreatorRecipesSheet({ value, onSelect }: { value: CreatorRecipeSort; onSelect: (value: CreatorRecipeSort) => void }) {
  return (
    <View style={styles.content}>
      <AppText style={styles.title}>Sort recipes</AppText>
      <Option label="Newest first" active={value === "newest"} onPress={() => onSelect("newest")} />
      <Option label="Top rated" active={value === "top_rated"} onPress={() => onSelect("top_rated")} />
    </View>
  );
}

function Option({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return <Pressable onPress={onPress} style={styles.option}><View style={[styles.radio, active && styles.radioActive]}>{active ? <View style={styles.dot} /> : null}</View><AppText style={[styles.label, active && styles.labelActive]}>{label}</AppText></Pressable>;
}

const styles = StyleSheet.create({
  content: { paddingBottom: 18 },
  title: { marginBottom: 6, fontFamily: theme.fontFamily.display, fontSize: 18, color: "#17291E" },
  option: { minHeight: 52, flexDirection: "row", alignItems: "center", gap: 12 },
  radio: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: "#E1E1E1", alignItems: "center", justifyContent: "center" },
  radioActive: { borderColor: "#17291E" },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: "#17291E" },
  label: { fontFamily: theme.fontFamily.bodyMedium, fontSize: 15, color: "#17291E" },
  labelActive: { fontFamily: theme.fontFamily.bodySemiBold },
});
