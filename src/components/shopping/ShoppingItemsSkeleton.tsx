import { StyleSheet, View } from "react-native";
import { theme } from "../../theme/theme";
import { SkeletonBlock, SkeletonGroup } from "../ui/Skeleton";

const CATEGORY_PILL_WIDTHS = [40, 70, 62, 76, 58];
const ITEM_ROWS = 5;

// Shaped like a shopping list's "Need to buy" heading, category pills and
// item rows (checkbox, ingredient picture, name and quantity, menu).
export function ShoppingItemsSkeleton() {
  return (
    <SkeletonGroup label="Loading your shopping list">
      <View style={styles.heading}>
        <SkeletonBlock width={100} height={19} />
        <SkeletonBlock width={50} height={13} />
      </View>
      <View style={styles.categories}>
        {CATEGORY_PILL_WIDTHS.map((width, index) => (
          <SkeletonBlock key={index} width={width} height={32} radius={999} />
        ))}
      </View>
      <View style={styles.panel}>
        {Array.from({ length: ITEM_ROWS }, (_, index) => (
          <View key={index} style={styles.row}>
            <SkeletonBlock width={24} height={24} radius={7} />
            <SkeletonBlock width={40} height={40} radius={10} />
            <View style={styles.info}>
              <SkeletonBlock width="60%" height={15} />
              <SkeletonBlock width="30%" height={12} />
            </View>
            <SkeletonBlock width={18} height={18} radius={5} style={styles.menu} />
          </View>
        ))}
      </View>
    </SkeletonGroup>
  );
}

const styles = StyleSheet.create({
  heading: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 3, marginBottom: 9 },
  categories: { flexDirection: "row", gap: 6, marginBottom: 12, overflow: "hidden" },
  panel: { paddingVertical: 3, borderWidth: 1, borderColor: theme.colors.border, borderRadius: 16, backgroundColor: theme.colors.white, overflow: "hidden" },
  row: { minHeight: 76, flexDirection: "row", alignItems: "center", gap: 12, paddingLeft: 9, paddingRight: 16 },
  info: { flex: 1, minWidth: 0, gap: 6 },
  menu: { marginLeft: 8 },
});
