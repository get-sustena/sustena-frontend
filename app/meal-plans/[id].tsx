import { router, useLocalSearchParams } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { useEffect } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { PlanMeals } from "../../src/components/planner/PlanMeals";
import { PlanOptionsSheet } from "../../src/components/planner/PlanSheets";
import { AppText } from "../../src/components/ui/AppText";
import { Icon } from "../../src/components/ui/Icon";
import { useAddPlanToList } from "../../src/hooks/useAddPlanToList";
import { usePlanCommands, useSavedPlans } from "../../src/hooks/useSavedPlans";
import { apiRecipeToLocalRecipe } from "../../src/lib/api/adapters";
import { openRecipe } from "../../src/lib/navigation/openRecipe";
import { currentPlanId, planSummary } from "../../src/lib/planner/planCommands";
import { closeSheet, openSheet, showToast } from "../../src/store/uiStore";
import { theme } from "../../src/theme/theme";

// One saved meal plan (MP-01): the same plan view as the planner, with
// swap, the total and "Add to shopping list". Works offline.
export default function SavedMealPlanScreen() {
  const insets = useSafeAreaInsets();
  const db = useSQLiteContext();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { plans, isLoading } = useSavedPlans();
  const planCommands = usePlanCommands();
  const { addPlanToList, isAdding } = useAddPlanToList();
  const plan = plans.find((saved) => saved.id === id);

  // A plan saved offline takes the server's id once it's sent; a deleted
  // plan closes its screen.
  useEffect(() => {
    if (isLoading || plan || !id) return;
    void currentPlanId(db, id).then((current) => {
      if (!current) goBack();
      else if (current !== id) router.setParams({ id: current });
    });
  }, [db, id, isLoading, plan]);

  function openPlanOptions() {
    if (!plan) return;
    openSheet(
      <PlanOptionsSheet
        name={plan.name}
        onRename={(name) => {
          void planCommands.renamePlan({ planId: plan.id, name }).then(() => {
            closeSheet();
            showToast("Plan renamed", "success");
          });
        }}
        onDelete={() => {
          void planCommands.deletePlan({ planId: plan.id }).then(() => {
            closeSheet();
            showToast("Plan deleted", "success");
          });
        }}
      />
    );
  }

  function swap(sourceItemId: string, targetItemId: string) {
    if (!plan) return;
    void planCommands.swapMeals({ planId: plan.id, sourceItemId, targetItemId });
    showToast("Meals swapped", "success");
  }

  const summary = plan ? planSummary(plan) : null;

  return (
    <View style={styles.screen}>
      <View style={[styles.header, { paddingTop: Math.max(52, insets.top + 5) }]}>
        <Pressable onPress={goBack} style={styles.iconButton} accessibilityRole="button" accessibilityLabel="Back to saved meal plans">
          <Icon name="chevronLeft" size={19} color={theme.colors.text} />
        </Pressable>
        <AppText style={styles.title} numberOfLines={1}>
          {plan?.name ?? ""}
        </AppText>
        <Pressable onPress={openPlanOptions} style={styles.iconButton} accessibilityRole="button" accessibilityLabel="Plan options">
          <Icon name="moreH" size={20} color={theme.colors.text} />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {plan && summary ? (
          <>
            <AppText style={styles.meta}>
              {summary.days} {summary.days === 1 ? "day" : "days"} · {summary.meals} {summary.meals === 1 ? "meal" : "meals"}
            </AppText>
            <PlanMeals
              meals={plan.items.flatMap((item) =>
                item.recipe
                  ? [
                      {
                        key: item.id,
                        recipe: apiRecipeToLocalRecipe(item.recipe),
                        estimatedCost: item.estimatedCost,
                        mealSlot: item.mealSlot,
                        day: item.day,
                      },
                    ]
                  : []
              )}
              onOpenRecipe={(recipeId) => openRecipe(recipeId, "meal_plan")}
              onSwap={swap}
              onAddToList={() =>
                void addPlanToList(plan.items.map((item) => ({ recipeId: item.recipeId, servings: item.servings, day: item.day })), plan.name)
              }
              addToListBusy={isAdding}
            />
          </>
        ) : null}
      </ScrollView>
    </View>
  );
}

// Back goes to Saved meal plans, also when the plan was opened from the
// planner's "Plan saved" toast.
function goBack() {
  if (router.canGoBack()) router.back();
  else router.replace("/meal-plans");
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#FAFAFA" },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  iconButton: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  title: {
    flex: 1,
    paddingHorizontal: 4,
    fontFamily: theme.fontFamily.display,
    fontSize: 18,
    letterSpacing: -0.18,
    color: theme.colors.text,
    textAlign: "center",
  },
  content: { paddingHorizontal: 20, paddingBottom: 120 },
  meta: {
    marginHorizontal: 2,
    marginBottom: 16,
    fontFamily: theme.fontFamily.bodyMedium,
    fontSize: 13,
    lineHeight: 18,
    color: theme.colors.textMuted,
    textAlign: "center",
  },
});
