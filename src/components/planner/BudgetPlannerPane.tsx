import { router } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { useEffect, useRef, useState } from "react";
import { Pressable, StyleSheet, TextInput, View } from "react-native";
import { insertShoppingListItems } from "../../db/shoppingListRepository";
import { useBudgetPlannerMutation } from "../../hooks/api/usePlanner";
import { useAddShoppingListItemMutation } from "../../hooks/api/useShoppingList";
import { apiRecipeToLocalRecipe } from "../../lib/api/adapters";
import { getApiErrorMessage } from "../../lib/api/errors";
import { recipesApi } from "../../lib/api";
import { formatNaira } from "../../lib/formatters";
import {
  generateShoppingListItemsFromRecipe,
  isPurchasableRecipeIngredient,
} from "../../lib/shoppingListGenerator";
import { useShoppingListStore } from "../../store/shoppingListStore";
import { theme } from "../../theme/theme";
import { AppText } from "../ui/AppText";
import { EmptyState } from "../ui/EmptyState";

const BUDGET_PRESETS = [3000, 5000, 10000, 15000];

const MEAL_SLOT_META = {
  breakfast: {
    label: "Breakfast",
    icon: "🌅",
  },
  lunch: {
    label: "Lunch",
    icon: "☀️",
  },
  dinner: {
    label: "Dinner",
    icon: "🌙",
  },
  snack: {
    label: "Snack",
    icon: "🍽️",
  },
} as const;

export function BudgetPlannerPane() {
  const db = useSQLiteContext();
  const [budget, setBudget] = useState("");
  const [isAddingAll, setIsAddingAll] = useState(false);
  const budgetPlannerMutation = useBudgetPlannerMutation();
  const addShoppingListItemMutation = useAddShoppingListItemMutation();
  const addItems = useShoppingListStore((state) => state.addItems);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastRequestedBudgetRef = useRef<number | null>(null);

  const numericBudget = Number(budget);

  const apiMeals =
    budgetPlannerMutation.data?.meals.map((meal) => ({
      recipe: apiRecipeToLocalRecipe(meal.recipe),
      estimatedCost: meal.estimatedCost,
      mealSlot: meal.mealSlot,
    })) ?? [];
  const totalSpend = apiMeals.reduce(
    (total, meal) => total + (meal.estimatedCost ?? 0),
    0
  );
  const budgetUsagePercent =
    numericBudget > 0 ? Math.min(100, (totalSpend / numericBudget) * 100) : 0;
  const isWithinBudget = numericBudget > 0 && totalSpend <= numericBudget;

  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  function requestBudgetPlan(nextBudget: number) {
    if (!nextBudget || nextBudget < 1000) return;

    lastRequestedBudgetRef.current = nextBudget;
    budgetPlannerMutation.mutate({
      budget: nextBudget,
      mealsPerDay: 3,
      days: 1,
      dietaryPreference: "no_restrictions",
      healthConditions: ["none"],
      allowUnknownCost: false,
    });
  }

  function updateBudget(value: string, options?: { immediate?: boolean }) {
    setBudget(value);
    budgetPlannerMutation.reset();

    const nextBudget = Number(value);

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    if (!nextBudget || nextBudget < 1000) {
      lastRequestedBudgetRef.current = null;
      return;
    }

    if (options?.immediate) {
      requestBudgetPlan(nextBudget);
      return;
    }

    debounceTimerRef.current = setTimeout(() => {
      if (lastRequestedBudgetRef.current !== nextBudget) {
        requestBudgetPlan(nextBudget);
      }
    }, 650);
  }

  async function handleAddAllToShoppingList() {
    if (apiMeals.length === 0 || isAddingAll) return;

    setIsAddingAll(true);

    try {
      const recipeDetails = await Promise.all(
        apiMeals.map((meal) => recipesApi.getRecipeById(meal.recipe.id))
      );

      await Promise.all(
        recipeDetails.flatMap((recipeDetail) =>
          recipeDetail.ingredients
            .filter(isPurchasableRecipeIngredient)
            .map((ingredient) => {
              const selectedUnit = ingredient.availableUnits[0];

              return addShoppingListItemMutation.mutateAsync({
                recipeId: recipeDetail.id,
                name:
                  ingredient.ingredientName ??
                  ingredient.canonicalIngredientName ??
                  ingredient.rawText,
                canonicalIngredientName: ingredient.canonicalIngredientName,
                emoji: null,
                quantity:
                  selectedUnit?.label ??
                  ingredient.displayText ??
                  ingredient.quantityText ??
                  ingredient.rawText,
                unit: selectedUnit?.unit ?? ingredient.unit,
                category: ingredient.category,
                estimatedPrice: null,
              });
            })
        )
      );

      const localItems = recipeDetails.flatMap((recipeDetail) => {
        const recipe = apiRecipeToLocalRecipe(recipeDetail);

        return generateShoppingListItemsFromRecipe({
          recipe,
          selectedServings: recipe.baseServings,
          unitMode: "metric",
        });
      });

      addItems(localItems);
      await insertShoppingListItems(db, localItems);
      router.push("/(tabs)/shopping");
    } catch (error) {
      console.error("Failed to add budget plan to shopping list", error);
    } finally {
      setIsAddingAll(false);
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.inputCard}>
        <AppText style={styles.inputLabel}>Enter your budget</AppText>

        <View style={styles.inputRow}>
          <AppText style={styles.naira}>₦</AppText>

          <TextInput
            value={budget}
            onChangeText={updateBudget}
            placeholder="0"
            keyboardType="number-pad"
            returnKeyType="done"
            onSubmitEditing={() => requestBudgetPlan(numericBudget)}
            placeholderTextColor={theme.colors.textDim}
            style={styles.input}
          />
        </View>

        <AppText style={styles.hint}>
          We&apos;ll generate breakfast, lunch &amp; dinner within your budget.
        </AppText>
      </View>

      <View style={styles.presets}>
        {BUDGET_PRESETS.map((preset) => {
          const isActive = numericBudget === preset;

          return (
            <Pressable
              key={preset}
              onPress={() => updateBudget(String(preset), { immediate: true })}
              style={[
                styles.presetButton,
                isActive && styles.activePresetButton,
              ]}
            >
              <AppText
                style={[
                  styles.presetLabel,
                  isActive && styles.activePresetLabel,
                ]}
              >
                {formatNaira(preset)}
              </AppText>
            </Pressable>
          );
        })}
      </View>

      {budgetPlannerMutation.isError ? (
        <EmptyState
          icon="⚠️"
          title="Could not generate plan"
          message={getApiErrorMessage(budgetPlannerMutation.error)}
        />
      ) : !numericBudget ? (
        <EmptyState
          icon="💸"
          title="Enter a budget"
          message="Add how much you have and we’ll suggest meals you can cook."
        />
      ) : budgetPlannerMutation.isPending ? (
        <EmptyState
          icon="💸"
          title="Generating plan"
          message="Finding breakfast, lunch, and dinner options within your budget."
        />
      ) : !budgetPlannerMutation.data ? (
        <EmptyState
          icon="💸"
          title="Ready to plan"
          message="Choose a preset or enter at least ₦1,000 to load your meal plan."
        />
      ) : apiMeals.length === 0 ? (
        <EmptyState
          icon="😔"
          title="No meals found"
          message="Try increasing your budget or checking back when we add more recipes."
        />
      ) : (
        <View style={styles.timetable}>
          <View style={styles.timetableHeader}>
            <AppText style={styles.timetableLabel}>Today&apos;s Meal Plan</AppText>
            <Pressable
              onPress={() => requestBudgetPlan(numericBudget)}
              disabled={budgetPlannerMutation.isPending}
              style={({ pressed }) => [
                styles.shuffleButton,
                pressed && styles.pressed,
                budgetPlannerMutation.isPending && styles.disabledButton,
              ]}
            >
              <AppText style={styles.shuffleText}>🔄 Shuffle</AppText>
            </Pressable>
          </View>

          {apiMeals.map(({ recipe, estimatedCost, mealSlot }) => {
            const mealMeta = MEAL_SLOT_META[mealSlot] ?? MEAL_SLOT_META.snack;

            return (
              <Pressable
                key={`${mealSlot}-${recipe.id}`}
                onPress={() =>
                  router.push({
                    pathname: "/recipes/[id]",
                    params: { id: recipe.id },
                  })
                }
                style={({ pressed }) => [
                  styles.mealSlot,
                  pressed && styles.pressed,
                ]}
              >
                <View style={styles.mealSlotLeft}>
                  <AppText style={styles.mealLabel}>{mealMeta.label}</AppText>
                  <AppText style={styles.mealIcon}>{mealMeta.icon}</AppText>
                </View>

                <View style={styles.slotDivider} />

                <View style={styles.mealInfo}>
                  <AppText style={styles.mealName}>{recipe.name}</AppText>
                  <AppText style={styles.mealMeta}>
                    ⏱ {recipe.time}
                    {recipe.calories !== null
                      ? ` · 🔥 ${recipe.calories} kcal`
                      : ""}
                  </AppText>
                </View>

                <View style={styles.costWrap}>
                  {estimatedCost !== null ? (
                    <AppText style={styles.costValue}>
                      {formatNaira(estimatedCost)}
                    </AppText>
                  ) : (
                    <AppText style={styles.costValueMuted}>--</AppText>
                  )}
                  <AppText style={styles.costLabel}>est. cost</AppText>
                </View>
              </Pressable>
            );
          })}

          <View style={styles.summary}>
            <View style={styles.summaryLeft}>
              <AppText style={styles.summaryLabel}>Total Spend</AppText>
              <AppText style={styles.summaryValue}>
                {formatNaira(totalSpend)}
              </AppText>
            </View>

            <View style={styles.summaryRight}>
              <AppText style={styles.summaryLabel}>
                of {formatNaira(numericBudget)} budget
              </AppText>
              <AppText
                style={[
                  styles.summaryStatus,
                  !isWithinBudget && styles.summaryStatusOver,
                ]}
              >
                {isWithinBudget ? "✓ Within budget" : "Over budget"}
              </AppText>
            </View>
          </View>

          <View style={styles.progressWrap}>
            <View style={styles.progressTrack}>
              <View
                style={[
                  styles.progressFill,
                  { width: `${budgetUsagePercent}%` },
                ]}
              />
            </View>
            <AppText style={styles.progressText}>
              {Math.round(budgetUsagePercent)}% of budget used
            </AppText>
          </View>

          <Pressable
            onPress={handleAddAllToShoppingList}
            disabled={isAddingAll}
            style={({ pressed }) => [
              styles.addAllButton,
              pressed && styles.pressed,
              isAddingAll && styles.disabledButton,
            ]}
          >
            <AppText style={styles.addAllText}>
              {isAddingAll ? "Adding..." : "📥 Add All to Shopping List"}
            </AppText>
          </Pressable>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
  },
  inputCard: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.xl,
    marginBottom: theme.spacing.md,
  },
  inputLabel: {
    fontFamily: theme.fontFamily.bodyBold,
    fontSize: 10,
    color: theme.colors.textMuted,
    letterSpacing: 1.5,
    textTransform: "uppercase",
    marginBottom: theme.spacing.sm,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.sm,
  },
  naira: {
    fontFamily: theme.fontFamily.display,
    fontSize: 32,
    color: theme.colors.orange,
  },
  input: {
    flex: 1,
    fontFamily: theme.fontFamily.display,
    fontSize: 32,
    color: theme.colors.navy,
    paddingVertical: 0,
  },
  hint: {
    fontFamily: theme.fontFamily.body,
    fontSize: 11,
    color: theme.colors.textMuted,
    marginTop: theme.spacing.sm,
  },
  presets: {
    flexDirection: "row",
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.lg,
  },
  presetButton: {
    flex: 1,
    borderRadius: theme.radius.sm,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    paddingVertical: theme.spacing.sm,
    alignItems: "center",
  },
  activePresetButton: {
    borderColor: theme.colors.navy,
    backgroundColor: theme.colors.navy,
  },
  presetLabel: {
    fontFamily: theme.fontFamily.bodyBold,
    fontSize: 11,
    color: theme.colors.textMuted,
  },
  activePresetLabel: {
    color: theme.colors.onDark,
  },
  timetable: {
    marginBottom: theme.spacing.md,
  },
  timetableHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: theme.spacing.md,
  },
  timetableLabel: {
    fontFamily: theme.fontFamily.bodyBold,
    fontSize: 10,
    color: theme.colors.textMuted,
    letterSpacing: 1.5,
    textTransform: "uppercase",
  },
  shuffleButton: {
    borderRadius: theme.radius.full,
    backgroundColor: theme.colors.orangeDim,
    borderWidth: 1,
    borderColor: theme.colors.borderOrange,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 7,
  },
  shuffleText: {
    fontFamily: theme.fontFamily.bodyBold,
    fontSize: 11,
    color: theme.colors.orange,
  },
  mealSlot: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.sm,
  },
  pressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
  disabledButton: {
    opacity: 0.5,
  },
  mealSlotLeft: {
    width: 74,
    alignItems: "center",
  },
  mealLabel: {
    fontFamily: theme.fontFamily.bodyBold,
    fontSize: 10,
    color: theme.colors.textMuted,
    textTransform: "uppercase",
  },
  mealIcon: {
    fontSize: 23,
    marginTop: 4,
  },
  slotDivider: {
    width: 1,
    height: 44,
    backgroundColor: theme.colors.border,
  },
  mealInfo: {
    flex: 1,
    minWidth: 0,
  },
  mealName: {
    fontFamily: theme.fontFamily.bodyBold,
    fontSize: 14,
    color: theme.colors.navy,
  },
  mealMeta: {
    fontFamily: theme.fontFamily.body,
    fontSize: 10,
    color: theme.colors.textMuted,
    marginTop: 2,
  },
  costWrap: {
    minWidth: 64,
    alignItems: "flex-end",
  },
  costValue: {
    fontFamily: theme.fontFamily.bodyBold,
    fontSize: 12,
    color: theme.colors.green,
  },
  costValueMuted: {
    fontFamily: theme.fontFamily.bodyBold,
    fontSize: 12,
    color: theme.colors.textMuted,
  },
  costLabel: {
    fontFamily: theme.fontFamily.bodyBold,
    fontSize: 8,
    color: theme.colors.textMuted,
    textTransform: "uppercase",
    marginTop: 2,
  },
  summary: {
    backgroundColor: theme.colors.navy,
    borderWidth: 1.5,
    borderColor: theme.colors.navy,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.md,
    flexDirection: "row",
    justifyContent: "space-between",
    gap: theme.spacing.md,
  },
  summaryLeft: {
    flex: 1,
  },
  summaryRight: {
    flex: 1,
    alignItems: "flex-end",
  },
  summaryLabel: {
    fontFamily: theme.fontFamily.bodyBold,
    fontSize: 10,
    color: theme.colors.onDark2,
  },
  summaryValue: {
    fontFamily: theme.fontFamily.display,
    fontSize: 24,
    color: theme.colors.white,
    marginTop: 2,
  },
  summaryStatus: {
    fontFamily: theme.fontFamily.bodyBold,
    fontSize: 13,
    color: theme.colors.orange2,
    marginTop: 5,
  },
  summaryStatusOver: {
    color: theme.colors.red,
  },
  progressWrap: {
    marginBottom: theme.spacing.md,
  },
  progressTrack: {
    height: 8,
    borderRadius: 999,
    backgroundColor: theme.colors.cream2,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 999,
    backgroundColor: theme.colors.orange,
  },
  progressText: {
    fontFamily: theme.fontFamily.body,
    fontSize: 10,
    color: theme.colors.textMuted,
    marginTop: 5,
  },
  addAllButton: {
    minHeight: 48,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.navy,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: theme.spacing.md,
  },
  addAllText: {
    fontFamily: theme.fontFamily.bodyBold,
    fontSize: 14,
    color: theme.colors.onDark,
  },
});
