import { StyleSheet, View } from "react-native";
import { theme } from "../../theme/theme";
import { SkeletonBlock, SkeletonGroup } from "../ui/Skeleton";

// A plan day shows breakfast, lunch and dinner.
const MEAL_ROWS = 3;

// Shaped like a day of the budget plan: meal rows with a photo, the meal
// slot, the recipe name and cost, and the swap button.
export function BudgetPlanSkeleton() {
  return (
    <SkeletonGroup label="Building your meal plan">
      {Array.from({ length: MEAL_ROWS }, (_, index) => (
        <View key={index} style={styles.row}>
          <SkeletonBlock width={64} height={64} radius={16} />
          <View style={styles.info}>
            <SkeletonBlock width={70} height={11} />
            <SkeletonBlock width="75%" height={16} />
            <SkeletonBlock width="45%" height={12} />
          </View>
          <SkeletonBlock width={36} height={36} radius={10} />
        </View>
      ))}
    </SkeletonGroup>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  info: { flex: 1, minWidth: 0, gap: 6 },
});
