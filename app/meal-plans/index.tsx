import { Image } from "expo-image";
import { router } from "expo-router";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { appImages } from "../../src/assets/appImages";
import { PlanOptionsSheet } from "../../src/components/planner/PlanSheets";
import { AppText } from "../../src/components/ui/AppText";
import { Icon } from "../../src/components/ui/Icon";
import { useAddPlanToList } from "../../src/hooks/useAddPlanToList";
import { usePlanCommands, useSavedPlans } from "../../src/hooks/useSavedPlans";
import { formatNaira } from "../../src/lib/formatters";
import { planSummary, type SavedPlan } from "../../src/lib/planner/planCommands";
import { closeSheet, openSheet, showToast } from "../../src/store/uiStore";
import { theme } from "../../src/theme/theme";

// Saved meal plans (MP-01, PRD v6.8 section 18), built like Shopping lists.
// Plans live on the phone, so this works offline.
export default function SavedMealPlansScreen() {
  const insets = useSafeAreaInsets();
  const { plans } = useSavedPlans();
  const planCommands = usePlanCommands();
  const { addPlanToList } = useAddPlanToList();

  function openNewPlan() {
    router.push({ pathname: "/(tabs)/planner", params: { tab: "budget" } });
  }

  function openPlanOptions(plan: SavedPlan) {
    openSheet(
      <PlanOptionsSheet
        name={plan.name}
        onRename={(name) => {
          void planCommands.renamePlan({ planId: plan.id, name }).then(() => {
            closeSheet();
            showToast("Plan renamed", "success");
          });
        }}
        onAddToList={() => {
          closeSheet();
          void addPlanToList(plan.items.map((item) => ({ recipeId: item.recipeId, servings: item.servings, day: item.day })), plan.name);
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

  return (
    <Animated.View entering={FadeInDown.duration(320)} style={styles.screen}>
      <View style={[styles.header, { paddingTop: Math.max(52, insets.top + 5) }]}>
        <View style={styles.headerStart}>
          <Pressable onPress={() => router.back()} style={styles.backButton} accessibilityRole="button" accessibilityLabel="Back">
            <Icon name="chevronLeft" size={19} color={theme.colors.text} />
          </Pressable>
          <AppText style={styles.title} numberOfLines={1}>
            Saved meal plans
          </AppText>
        </View>

        <Pressable
          onPress={openNewPlan}
          style={({ pressed }) => [styles.newPlanButton, pressed && styles.pressed]}
          accessibilityRole="button"
          accessibilityLabel="Create a new meal plan"
        >
          <Icon name="plus" size={17} color={theme.colors.onDark} />
          <AppText style={styles.newPlanButtonText}>New plan</AppText>
        </Pressable>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {plans.length === 0 ? (
          <View style={styles.empty}>
            <Image source={appImages.emptyStates.savedRecipe} contentFit="contain" style={styles.emptyImage} />
            <AppText style={styles.emptyTitle}>No saved meal plans yet</AppText>
            <AppText style={styles.emptyText}>Plans you save show up here, so you can cook from them again.</AppText>
            <Pressable onPress={openNewPlan} style={({ pressed }) => [styles.emptyButton, pressed && styles.pressed]}>
              <Icon name="plus" size={16} color={theme.colors.onDark} />
              <AppText style={styles.emptyButtonText}>Create a plan</AppText>
            </Pressable>
          </View>
        ) : (
          <>
            <View style={styles.overviewMeta}>
              <AppText style={styles.overviewCount}>
                {plans.length} {plans.length === 1 ? "plan" : "plans"}
              </AppText>
              <AppText style={styles.overviewOrder}>Most recent first</AppText>
            </View>
            <View style={styles.planGrid}>
              {plans.map((plan) => {
                const { days, meals, cost } = planSummary(plan);
                return (
                  <View key={plan.id} style={styles.planCard}>
                    <Pressable
                      onPress={() => router.push({ pathname: "/meal-plans/[id]", params: { id: plan.id } })}
                      style={({ pressed }) => [styles.planMain, pressed && styles.pressed]}
                      accessibilityRole="button"
                      accessibilityLabel={`Open ${plan.name}`}
                    >
                      <View style={styles.planInfo}>
                        <AppText style={styles.planName} numberOfLines={1}>
                          {plan.name}
                        </AppText>
                        <View style={styles.planMetaRow}>
                          <AppText style={styles.planMetaDays}>
                            {days} {days === 1 ? "day" : "days"}
                          </AppText>
                          <AppText style={styles.planMeta}>·</AppText>
                          <AppText style={styles.planMeta}>
                            {meals} {meals === 1 ? "meal" : "meals"}
                          </AppText>
                          <AppText style={styles.planMeta}>·</AppText>
                          <AppText style={styles.planMeta}>{formatNaira(cost)}</AppText>
                        </View>
                      </View>
                      <Icon name="chevronRight" size={17} color={theme.colors.textMuted} />
                    </Pressable>
                    <Pressable
                      onPress={() => openPlanOptions(plan)}
                      hitSlop={8}
                      style={styles.optionsButton}
                      accessibilityRole="button"
                      accessibilityLabel={`Options for ${plan.name}`}
                    >
                      <Icon name="moreH" size={18} color={theme.colors.textMuted} />
                    </Pressable>
                  </View>
                );
              })}
            </View>
          </>
        )}
      </ScrollView>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#FAFAFA" },
  scroll: { flex: 1 },
  scrollContent: { paddingTop: 6, paddingHorizontal: 20, paddingBottom: 120 },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  headerStart: { flex: 1, minWidth: 0, flexDirection: "row", alignItems: "center", marginLeft: -12 },
  backButton: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  title: {
    flexShrink: 1,
    fontFamily: theme.fontFamily.display,
    fontSize: 26,
    letterSpacing: -0.39,
    color: theme.colors.navy,
  },
  newPlanButton: {
    minHeight: 44,
    borderRadius: 999,
    paddingHorizontal: 14,
    flexDirection: "row",
    gap: 7,
    backgroundColor: theme.colors.navy,
    alignItems: "center",
    justifyContent: "center",
  },
  newPlanButtonText: { fontFamily: theme.fontFamily.bodyBold, fontSize: 13.5, color: theme.colors.onDark },
  pressed: { opacity: 0.9 },
  empty: { alignItems: "center", paddingTop: 56 },
  emptyImage: { width: 138, height: 92, marginBottom: 28 },
  emptyTitle: { fontFamily: theme.fontFamily.display, fontSize: 18, color: theme.colors.text, marginBottom: 8 },
  emptyText: {
    fontFamily: theme.fontFamily.body,
    fontSize: 13.5,
    lineHeight: 20,
    color: theme.colors.textMedium,
    textAlign: "center",
    maxWidth: 260,
    marginBottom: 20,
  },
  emptyButton: {
    backgroundColor: theme.colors.navy,
    borderRadius: 999,
    paddingHorizontal: 22,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  emptyButtonText: { fontFamily: theme.fontFamily.bodySemiBold, fontSize: 14.5, color: theme.colors.onDark },
  overviewMeta: {
    marginHorizontal: 2,
    marginBottom: 9,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  overviewCount: { fontFamily: theme.fontFamily.bodySemiBold, fontSize: 12.5, color: theme.colors.textMedium },
  overviewOrder: { fontFamily: theme.fontFamily.body, fontSize: 12, color: theme.colors.textMuted },
  planGrid: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: theme.colors.white,
  },
  planCard: {
    backgroundColor: theme.colors.white,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    minHeight: 76,
    flexDirection: "row",
    alignItems: "center",
  },
  planMain: {
    flex: 1,
    minWidth: 0,
    alignSelf: "stretch",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    paddingLeft: 15,
    paddingRight: 8,
    paddingVertical: 14,
  },
  planInfo: { flex: 1, minWidth: 0 },
  planName: { fontFamily: theme.fontFamily.display, fontSize: 16, lineHeight: 21, color: theme.colors.text },
  planMetaRow: { flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 7, marginTop: 5 },
  planMetaDays: { fontFamily: theme.fontFamily.bodySemiBold, fontSize: 12.5, color: theme.colors.text },
  planMeta: { fontFamily: theme.fontFamily.body, fontSize: 12.5, color: theme.colors.textMedium },
  optionsButton: {
    width: 44,
    height: 44,
    marginRight: 8,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
  },
});
