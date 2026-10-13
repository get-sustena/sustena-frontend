import { StyleSheet, View } from "react-native";
import { theme } from "../../theme/theme";
import { SkeletonBlock, SkeletonGroup } from "../ui/Skeleton";

// Widths of the All, Proteins, Grains, Produce, Spices and Dairy pills.
const CATEGORY_PILL_WIDTHS = [40, 78, 64, 72, 62, 54];
const INGREDIENT_ROWS = 7;
const MATCH_CARDS = 3;

// Shaped like the Pantry tab: the "Your ingredients" row, search, category
// pills, the count and the ingredient list.
export function PantryListSkeleton() {
  return (
    <SkeletonGroup label="Loading your pantry">
      <View style={styles.sectionHeader}>
        <SkeletonBlock width={150} height={22} />
        <SkeletonBlock width={160} height={44} radius={999} />
      </View>
      <SkeletonBlock height={48} radius={13} />
      <View style={styles.categories}>
        {CATEGORY_PILL_WIDTHS.map((width, index) => (
          <SkeletonBlock key={index} width={width} height={32} radius={999} />
        ))}
      </View>
      <SkeletonBlock width={110} height={15} style={styles.count} />
      <View style={styles.list}>
        {Array.from({ length: INGREDIENT_ROWS }, (_, index) => (
          <View key={index} style={styles.ingredientRow}>
            <SkeletonBlock width={48} height={48} radius={10} />
            <SkeletonBlock width="45%" height={14} />
            <SkeletonBlock width={20} height={20} radius={5} style={styles.ingredientAction} />
          </View>
        ))}
      </View>
    </SkeletonGroup>
  );
}

// Shaped like the "Matching Recipes" results under "Edit pantry".
export function PantryMatchesSkeleton() {
  return (
    <SkeletonGroup label="Finding matching recipes">
      <SkeletonBlock width={160} height={14} style={styles.resultsCount} />
      <View style={styles.list}>
        {Array.from({ length: MATCH_CARDS }, (_, index) => (
          <View key={index} style={styles.resultCard}>
            <SkeletonBlock width={52} height={52} radius={12} />
            <View style={styles.resultCopy}>
              <SkeletonBlock width="70%" height={15} />
              <SkeletonBlock width="40%" height={11} />
              <SkeletonBlock width="85%" height={11} />
              <SkeletonBlock width="60%" height={11} />
            </View>
            <SkeletonBlock width={46} height={34} radius={8} />
          </View>
        ))}
      </View>
    </SkeletonGroup>
  );
}

const styles = StyleSheet.create({
  sectionHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 14 },
  categories: { flexDirection: "row", gap: 6, paddingVertical: 13, overflow: "hidden" },
  count: { marginBottom: 9 },
  list: { gap: 8 },
  ingredientRow: { minHeight: 60, flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 10, borderWidth: 0.75, borderColor: theme.colors.border, borderRadius: 14, backgroundColor: theme.colors.card },
  ingredientAction: { marginLeft: "auto", marginRight: 12 },
  resultsCount: { marginTop: 6, marginBottom: 12 },
  resultCard: { padding: 12, borderWidth: 0.75, borderColor: theme.colors.border, borderRadius: 14, backgroundColor: theme.colors.card, flexDirection: "row", alignItems: "center", gap: 14 },
  resultCopy: { flex: 1, minWidth: 0, gap: 5 },
});
