import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import type { Recipe } from "../../data/recipes";
import { formatNaira } from "../../lib/formatters";
import { closeSheet, openSheet } from "../../store/uiStore";
import { theme } from "../../theme/theme";
import type { MealSlot } from "../../types/api";
import { RecipePhoto } from "../recipe/RecipePhoto";
import { AppText } from "../ui/AppText";
import { Icon } from "../ui/Icon";
import { TickIn } from "../ui/TickIn";

type PlanMeal = {
  // What a swap names the meal by: its place on an unsaved plan, its id on
  // a saved one.
  key: string;
  recipe: Recipe;
  estimatedCost: number | null;
  mealSlot: MealSlot;
  day: number;
};

const MEAL_SLOT_ORDER: MealSlot[] = ["breakfast", "lunch", "dinner", "snack"];
const MEAL_SLOT_LABEL: Record<MealSlot, string> = {
  breakfast: "Breakfast",
  lunch: "Lunch",
  dinner: "Dinner",
  snack: "Snack",
};

const ALL_DAYS = -1;

const byPlace = (a: PlanMeal, b: PlanMeal) =>
  a.day - b.day || MEAL_SLOT_ORDER.indexOf(a.mealSlot) - MEAL_SLOT_ORDER.indexOf(b.mealSlot);
const costOf = (meals: PlanMeal[]) => meals.reduce((sum, meal) => sum + (meal.estimatedCost ?? 0), 0);

type Props = {
  meals: PlanMeal[];
  onOpenRecipe: (recipeId: string) => void;
  onSwap: (sourceKey: string, targetKey: string) => void;
  onAddToList: () => void;
  addToListBusy?: boolean;
  // The planner's "Save plan", which reads "Saved" once the plan is saved.
  save?: { saved: boolean; onSave: () => void };
};

// A meal plan (PRD v6.8 section 18), on the planner and on a saved plan's
// screen: "All days" and a chip per day for plans of 2 days or more, the
// meals with Swap, the total and "Add to shopping list".
export function PlanMeals({ meals, onOpenRecipe, onSwap, onAddToList, addToListBusy = false, save }: Props) {
  const sorted = [...meals].sort(byPlace);
  const days = [...new Set(sorted.map((meal) => meal.day))];
  const [view, setView] = useState(ALL_DAYS);
  const shownDay = days.length > 1 ? (view === ALL_DAYS || days.includes(view) ? view : ALL_DAYS) : days[0];

  function openSwap(source: PlanMeal) {
    openSheet(
      <MealSwapSheet
        source={source}
        meals={sorted}
        showDays={days.length > 1}
        onSelect={(target) => {
          closeSheet();
          onSwap(source.key, target.key);
        }}
      />
    );
  }

  const row = (meal: PlanMeal) => (
    <MealRow key={meal.key} meal={meal} onOpen={() => onOpenRecipe(meal.recipe.id)} onSwap={() => openSwap(meal)} />
  );

  return (
    <View style={styles.results}>
      {days.length > 1 ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.dayChipRow}>
          {[ALL_DAYS, ...days].map((day) => {
            const active = shownDay === day;
            return (
              <Pressable
                key={day}
                onPress={() => setView(day)}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                style={[styles.dayChip, active && styles.dayChipActive]}
              >
                <AppText style={[styles.dayChipText, active && styles.dayChipTextActive]}>
                  {day === ALL_DAYS ? "All days" : `Day ${day}`}
                </AppText>
              </Pressable>
            );
          })}
        </ScrollView>
      ) : null}

      {shownDay === ALL_DAYS
        ? days.map((day, index) => {
            const dayMeals = sorted.filter((meal) => meal.day === day);
            return (
              <View key={day}>
                <View style={[styles.dayHead, index === 0 && styles.dayHeadFirst]}>
                  <AppText style={styles.dayHeadTitle}>Day {day}</AppText>
                  <AppText style={styles.dayHeadCost}>{formatNaira(costOf(dayMeals))}</AppText>
                </View>
                {dayMeals.map(row)}
              </View>
            );
          })
        : sorted.filter((meal) => meal.day === shownDay).map(row)}

      <View style={styles.totalCard}>
        <AppText style={styles.totalValue}>{formatNaira(costOf(sorted))}</AppText>
        <Pressable
          onPress={onAddToList}
          disabled={addToListBusy}
          style={({ pressed }) => [styles.addButton, pressed && styles.pressed, addToListBusy && styles.disabled]}
        >
          <AppText style={styles.addButtonText}>{addToListBusy ? "Adding..." : "Add to shopping list"}</AppText>
        </Pressable>
      </View>

      {save ? (
        <Pressable
          onPress={save.onSave}
          disabled={save.saved}
          accessibilityRole="button"
          accessibilityState={{ disabled: save.saved }}
          style={({ pressed }) => [styles.saveButton, save.saved && styles.saveButtonSaved, pressed && styles.pressed]}
        >
          {save.saved ? (
            <>
              <TickIn />
              <AppText style={[styles.saveLabel, styles.saveLabelSaved]}>Saved</AppText>
            </>
          ) : (
            <>
              <Icon name="bookmark" size={18} color={theme.colors.navy} />
              <AppText style={styles.saveLabel}>Save plan</AppText>
            </>
          )}
        </Pressable>
      ) : null}
    </View>
  );
}

function MealRow({ meal, onOpen, onSwap }: { meal: PlanMeal; onOpen: () => void; onSwap: () => void }) {
  const label = MEAL_SLOT_LABEL[meal.mealSlot];
  return (
    <View style={styles.mealRow}>
      <Pressable onPress={onOpen} style={({ pressed }) => [styles.mealMain, pressed && styles.pressed]}>
        <RecipePhoto imageUrl={meal.recipe.imageUrl} style={styles.mealThumb} />
        <View style={styles.mealInfo}>
          <AppText style={styles.mealSlotLabel}>{label}</AppText>
          <AppText style={styles.mealName} numberOfLines={1}>
            {meal.recipe.name}
          </AppText>
          <AppText style={styles.mealMeta}>
            {meal.recipe.time}
            {meal.estimatedCost !== null ? ` · ${formatNaira(meal.estimatedCost)}` : ""}
          </AppText>
        </View>
      </Pressable>
      <Pressable
        onPress={onSwap}
        style={({ pressed }) => [styles.swapButton, pressed && styles.pressed]}
        accessibilityRole="button"
        accessibilityLabel={`Swap ${label} meal`}
      >
        <Icon name="swap" size={16} color={theme.colors.text} />
      </Pressable>
    </View>
  );
}

function MealSwapSheet({
  source,
  meals,
  showDays,
  onSelect,
}: {
  source: PlanMeal;
  meals: PlanMeal[];
  showDays: boolean;
  onSelect: (target: PlanMeal) => void;
}) {
  const place = (meal: PlanMeal) => (showDays ? `Day ${meal.day} · ` : "") + MEAL_SLOT_LABEL[meal.mealSlot];
  const choices = meals.filter((meal) => meal.key !== source.key);

  return (
    <View style={styles.swapSheet}>
      <AppText style={styles.swapSheetTitle}>Swap meal</AppText>
      <AppText style={styles.swapSheetDescription}>
        Choose a meal to swap with <AppText style={styles.swapSheetSourceName}>{source.recipe.name}</AppText> (
        {place(source)})
      </AppText>

      <ScrollView style={styles.swapSheetList} showsVerticalScrollIndicator={false} nestedScrollEnabled>
        {choices.length === 0 ? <AppText style={styles.swapSheetEmpty}>No other meals to swap with.</AppText> : null}
        {choices.map((meal, index) => (
          <Pressable
            key={meal.key}
            onPress={() => onSelect(meal)}
            style={({ pressed }) => [
              styles.swapSheetRow,
              index === choices.length - 1 && styles.swapSheetRowLast,
              pressed && styles.pressed,
            ]}
          >
            <RecipePhoto imageUrl={meal.recipe.imageUrl} style={styles.swapSheetThumb} />
            <View style={styles.swapSheetInfo}>
              <AppText style={styles.swapSheetSlot}>{place(meal)}</AppText>
              <AppText style={styles.swapSheetName} numberOfLines={1}>
                {meal.recipe.name}
              </AppText>
            </View>
            <Icon name="swap" size={16} color={theme.colors.textMuted} />
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  results: { marginBottom: theme.spacing.md },
  dayChipRow: { gap: 8, paddingBottom: 16 },
  dayChip: {
    paddingHorizontal: 20,
    paddingVertical: 11,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.page,
  },
  dayChipActive: { borderColor: theme.colors.navy, backgroundColor: theme.colors.navy },
  dayChipText: { fontFamily: theme.fontFamily.body, fontSize: 14, color: "#494D42" },
  dayChipTextActive: { color: "#C7CCC0" },
  // v6.8 .plan-all-head.
  dayHead: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
    gap: 12,
    marginTop: 22,
    marginHorizontal: 2,
    marginBottom: 2,
  },
  dayHeadFirst: { marginTop: 2 },
  dayHeadTitle: {
    fontFamily: theme.fontFamily.display,
    fontSize: 17,
    lineHeight: 20,
    letterSpacing: -0.17,
    color: theme.colors.text,
  },
  dayHeadCost: { fontFamily: theme.fontFamily.bodyMedium, fontSize: 13, color: theme.colors.textMuted },
  mealRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  mealMain: { flex: 1, minWidth: 0, flexDirection: "row", alignItems: "center", gap: 10 },
  mealThumb: { width: 64, height: 64, borderRadius: 16 },
  mealInfo: { flex: 1, minWidth: 0 },
  mealSlotLabel: {
    fontFamily: theme.fontFamily.body,
    fontSize: 11.5,
    letterSpacing: 0.69,
    textTransform: "uppercase",
    color: theme.colors.goldText,
    marginBottom: 4,
  },
  mealName: { fontFamily: theme.fontFamily.bodySemiBold, fontSize: 15, lineHeight: 19, color: theme.colors.text },
  mealMeta: { fontFamily: theme.fontFamily.body, fontSize: 12.5, color: theme.colors.textMedium, marginTop: 5 },
  swapButton: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: theme.colors.card2,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  totalCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: theme.colors.control,
    borderRadius: 16,
    padding: 14,
    paddingHorizontal: 16,
    marginTop: 16,
  },
  totalValue: { fontFamily: theme.fontFamily.display, fontSize: 19, color: theme.colors.navy3, marginTop: 3 },
  addButton: { backgroundColor: theme.colors.navy, borderRadius: 999, paddingHorizontal: 16, paddingVertical: 11 },
  addButtonText: { fontFamily: theme.fontFamily.bodySemiBold, fontSize: 12.5, color: theme.colors.onDark },
  // v6.8 .co-secondary.plan-save-btn, and .is-cooked once saved.
  saveButton: {
    marginTop: 12,
    minHeight: 52,
    paddingHorizontal: 20,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: theme.colors.lineStrong,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  saveButtonSaved: { borderColor: theme.colors.navy3 },
  saveLabel: { fontFamily: theme.fontFamily.bodySemiBold, fontSize: 15, color: theme.colors.navy },
  saveLabelSaved: { color: theme.colors.navy3 },
  swapSheet: { paddingBottom: 24 },
  swapSheetTitle: { fontFamily: theme.fontFamily.display, fontSize: 19, color: theme.colors.text, marginBottom: 4 },
  swapSheetDescription: {
    fontFamily: theme.fontFamily.body,
    fontSize: 13,
    lineHeight: 19,
    color: theme.colors.textMedium,
    marginBottom: 14,
  },
  swapSheetSourceName: { fontFamily: theme.fontFamily.bodyBold, color: theme.colors.text },
  swapSheetList: { maxHeight: 360 },
  swapSheetEmpty: {
    fontFamily: theme.fontFamily.body,
    fontSize: 13.5,
    lineHeight: 20,
    color: theme.colors.textMedium,
    paddingVertical: 20,
    textAlign: "center",
  },
  swapSheetRow: {
    minHeight: 66,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    paddingVertical: 10,
  },
  swapSheetRowLast: { borderBottomWidth: 0 },
  swapSheetThumb: { width: 44, height: 44, borderRadius: 8 },
  swapSheetInfo: { flex: 1, minWidth: 0 },
  swapSheetSlot: {
    fontFamily: theme.fontFamily.body,
    fontSize: 11,
    letterSpacing: 0.66,
    color: theme.colors.goldText,
    textTransform: "uppercase",
  },
  swapSheetName: { fontFamily: theme.fontFamily.bodySemiBold, fontSize: 14, color: theme.colors.text, marginTop: 3 },
  pressed: { opacity: 0.9 },
  disabled: { opacity: 0.5 },
});
