import { router, useLocalSearchParams } from "expo-router";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BudgetPlannerPane } from "../../src/components/planner/BudgetPlannerPane";
import { PantryPane } from "../../src/components/pantry/PantryPane";
import { TAB_BAR_CLEARANCE } from "../../src/components/layout/tabBarClearance";
import { AppText } from "../../src/components/ui/AppText";
import { Icon } from "../../src/components/ui/Icon";
import { useSavedPlans } from "../../src/hooks/useSavedPlans";
import { usePantryStore } from "../../src/store/pantryStore";
import { theme } from "../../src/theme/theme";

export default function PantryScreen() {
  const insets = useSafeAreaInsets();
  const { tab, category } = useLocalSearchParams<{ tab?: string; category?: string }>();
  const isBudget = tab === "budget";
  const pantryCount = usePantryStore((state) => state.ingredientIds.length);

  return (
    <View style={styles.screen}>
      <View style={[styles.header, !isBudget && styles.kitchenHeader, { paddingTop: Math.max(insets.top + 6, 48) }]}>
        {isBudget ? (
          <Pressable onPress={() => router.back()} style={styles.back} accessibilityLabel="Back">
            <Icon name="chevronLeft" size={19} color={theme.colors.text} />
          </Pressable>
        ) : null}
        <AppText style={[styles.title, !isBudget && styles.kitchenTitle]}>{isBudget ? "Budget planner" : "Your Pantry"}</AppText>
        {isBudget ? (
          <SavedPlansButton />
        ) : (
          <AppText style={[styles.meta, styles.kitchenMeta]}>{`${pantryCount} ingredient${pantryCount === 1 ? "" : "s"}`}</AppText>
        )}
      </View>
      {isBudget ? (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
          <BudgetPlannerPane />
        </ScrollView>
      ) : (
        // The pantry scrolls itself so its search and categories can stay pinned.
        <PantryPane key={category ?? "All"} initialCategory={category} />
      )}
    </View>
  );
}

// Saved meal plans, with how many there are (MP-01).
function SavedPlansButton() {
  const count = useSavedPlans().plans.length;
  return (
    <Pressable
      onPress={() => router.push("/meal-plans")}
      style={styles.savedButton}
      accessibilityRole="button"
      accessibilityLabel={count ? `Saved meal plans, ${count}` : "Saved meal plans"}
    >
      <Icon name="bookmark" size={21} color={theme.colors.text} />
      {count ? (
        <View style={styles.savedCount}>
          <AppText style={styles.savedCountText}>{count}</AppText>
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#FAFAFA" },
  header: { minHeight: 94, paddingHorizontal: 20, paddingBottom: 16, flexDirection: "row", alignItems: "center" },
  kitchenHeader: { paddingBottom: 18, alignItems: "flex-end" },
  back: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  title: { flex: 1, fontFamily: theme.fontFamily.display, fontSize: 24, color: theme.colors.text, textAlign: "center" },
  kitchenTitle: { fontSize: 34, lineHeight: 37, letterSpacing: -0.85, color: theme.colors.navy, textAlign: "left" },
  meta: { width: 76, fontFamily: theme.fontFamily.bodyMedium, fontSize: 11.5, color: theme.colors.textMuted, textAlign: "right" },
  kitchenMeta: { width: "auto", fontFamily: theme.fontFamily.bodySemiBold, fontSize: 12.5, color: theme.colors.textMedium, paddingBottom: 2 },
  savedButton: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  // Brand green marks a saved state (brand system, colour rules).
  savedCount: {
    position: "absolute",
    top: 3,
    right: 1,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 5,
    borderRadius: 999,
    backgroundColor: theme.colors.navy3,
    alignItems: "center",
    justifyContent: "center",
  },
  savedCountText: { fontFamily: theme.fontFamily.bodyBold, fontSize: 11, lineHeight: 18, color: theme.colors.white },
  content: { paddingHorizontal: 20, paddingBottom: TAB_BAR_CLEARANCE },
});
