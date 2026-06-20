import { useState } from "react";
import { StyleSheet, View } from "react-native";
import { BudgetPlannerPane } from "../../src/components/planner/BudgetPlannerPane";
import { CaloriesPlannerPane } from "../../src/components/planner/CaloriesPlannerPane";
import { KitchenPlannerPane } from "../../src/components/planner/KitchenPlannerPane";
import { PlannerTabButton } from "../../src/components/planner/PlannerTabButton";
import { TimetablePlannerPane } from "../../src/components/planner/TimetablePlannerPane";
import { AppText } from "../../src/components/ui/AppText";
import { Screen } from "../../src/components/ui/Screen";
import { useRecipesWithLocalFallback } from "../../src/hooks/api/useRecipes";
import { apiRecipeToLocalRecipe } from "../../src/lib/api/adapters";
import { theme } from "../../src/theme/theme";
import { PlannerTab } from "../../src/types/planner";

const PLANNER_TABS: {
  label: string;
  value: PlannerTab;
}[] = [
  {
    label: "💸 Budget",
    value: "budget",
  },
  {
    label: "🥬 Kitchen",
    value: "kitchen",
  },
  {
    label: "📅 Plan",
    value: "timetable",
  },
  {
    label: "🔥 Calories",
    value: "calories",
  },
];

export default function PlannerScreen() {
  const [activeTab, setActiveTab] = useState<PlannerTab>("budget");
  const recipesQuery = useRecipesWithLocalFallback({ page: 1, pageSize: 200 });
  const recipes = recipesQuery.data?.items.map(apiRecipeToLocalRecipe) ?? [];

  return (
    <Screen scroll>
      <Decorations />

      <View style={styles.header}>
        <View>
          <AppText style={styles.eyebrow}>SMART PLANNER</AppText>
          <AppText style={styles.title}>What’s your goal?</AppText>
        </View>
      </View>

      <View style={styles.tabsWrapper}>
        {PLANNER_TABS.map((tab) => (
          <PlannerTabButton
            key={tab.value}
            label={tab.label}
            value={tab.value}
            active={activeTab === tab.value}
            onPress={setActiveTab}
          />
        ))}
      </View>

      {activeTab === "budget" ? <BudgetPlannerPane recipes={recipes} /> : null}

      {activeTab === "kitchen" ? (
        <KitchenPlannerPane recipes={recipes} />
      ) : null}

      {activeTab === "timetable" ? <TimetablePlannerPane /> : null}

      {activeTab === "calories" ? <CaloriesPlannerPane /> : null}
    </Screen>
  );
}

function Decorations() {
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <AppText style={[styles.deco, styles.decoCalendar]}>📅</AppText>
      <AppText style={[styles.deco, styles.decoLeaf]}>🌿</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 24,
    paddingTop: 52,
    paddingBottom: 14,
  },
  eyebrow: {
    fontFamily: theme.fontFamily.bodyBold,
    fontSize: 10,
    color: theme.colors.textMuted,
    letterSpacing: 2,
    textTransform: "uppercase",
    marginBottom: 3,
  },
  title: {
    fontFamily: theme.fontFamily.display,
    fontSize: 24,
    lineHeight: 28,
    color: theme.colors.navy,
  },
  tabsWrapper: {
    marginHorizontal: 20,
    marginBottom: theme.spacing.xl,
    padding: 4,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    flexDirection: "row",
    gap: 2,
  },
  deco: {
    position: "absolute",
    opacity: 0.08,
  },
  decoCalendar: {
    top: "10%",
    right: "8%",
    fontSize: 42,
    transform: [{ rotate: "15deg" }],
  },
  decoLeaf: {
    bottom: "18%",
    left: "4%",
    fontSize: 34,
    transform: [{ rotate: "-20deg" }],
  },
});
