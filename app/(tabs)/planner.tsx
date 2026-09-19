import { router, useLocalSearchParams } from "expo-router";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BudgetPlannerPane } from "../../src/components/planner/BudgetPlannerPane";
import { PantryPane } from "../../src/components/pantry/PantryPane";
import { AppText } from "../../src/components/ui/AppText";
import { Icon } from "../../src/components/ui/Icon";
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
        <AppText style={[styles.meta, !isBudget && styles.kitchenMeta]}>{isBudget ? "" : `${pantryCount} ingredient${pantryCount === 1 ? "" : "s"}`}</AppText>
      </View>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[styles.content, { paddingBottom: Math.max(insets.bottom, 16) + 100 }]}>
        {isBudget ? <BudgetPlannerPane /> : <PantryPane key={category ?? "All"} initialCategory={category} />}
      </ScrollView>
    </View>
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
  content: { paddingHorizontal: 20 },
});
