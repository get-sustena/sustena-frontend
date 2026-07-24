import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { useEffect, useState } from "react";
import {
  Keyboard,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import type { Recipe } from "../../data/recipes";
import { insertShoppingListItems } from "../../db/shoppingListRepository";
import { useBudgetPlannerMutation } from "../../hooks/api/usePlanner";
import { useUpdatePreferencesMutation } from "../../hooks/api/usePreferences";
import {
  useProfileAnswersQuery,
  useUpdateProfileAnswersMutation,
} from "../../hooks/api/useProfileAnswers";
import { useAddShoppingListItemMutation } from "../../hooks/api/useShoppingList";
import { apiRecipeToLocalRecipe } from "../../lib/api/adapters";
import { getApiErrorMessage } from "../../lib/api/errors";
import { recipesApi } from "../../lib/api";
import { formatNaira } from "../../lib/formatters";
import {
  generateShoppingListItemsFromRecipe,
  isPurchasableRecipeIngredient,
} from "../../lib/shoppingListGenerator";
import { usePreferencesStore } from "../../store/preferencesStore";
import { useProfileAnswersStore } from "../../store/profileAnswersStore";
import { useShoppingListStore } from "../../store/shoppingListStore";
import { closeSheet, openSheet, showToast } from "../../store/uiStore";
import { theme } from "../../theme/theme";
import type { MealSlot } from "../../types/api";
import { DEFAULT_SHOPPING_LIST_ID } from "../../types/shoppingList";
import { RecipePhoto } from "../recipe/RecipePhoto";
import { AppText } from "../ui/AppText";
import { EmptyState } from "../ui/EmptyState";
import { Icon } from "../ui/Icon";
import {
  MEAL_PLAN_LOADING_MESSAGES,
  ProgressLoader,
} from "../ui/ProgressLoader";
import {
  QuickPlanSetupModal,
  QuickPlanSetupValue,
} from "./QuickPlanSetupModal";

const BUDGET_PRESETS = [3000, 5000, 10000, 15000];
const VALID_HABIT_WHO = new Set(["me", "partner", "family", "friends"]);
const VALID_HABIT_TIME = new Set(["15", "15-30", "30-45", "45-60", "60+"]);
const SERVINGS_BY_HABIT_WHO: Record<string, number> = {
  me: 1,
  partner: 2,
  family: 3,
  friends: 3,
};
const TIME_CAP_BY_HABIT: Record<string, number> = {
  "15": 15,
  "15-30": 30,
  "30-45": 45,
  "45-60": 60,
  "60+": Number.POSITIVE_INFINITY,
};
const TIME_LABEL_BY_HABIT: Record<string, string> = {
  "15": "Under 15 min",
  "15-30": "Up to 30 min",
  "30-45": "Up to 45 min",
  "45-60": "Up to 60 min",
  "60+": "Any cook time",
};
const MEAL_SLOT_ORDER: MealSlot[] = ["breakfast", "lunch", "dinner", "snack"];

const MEAL_SLOT_META = {
  breakfast: { label: "Breakfast" },
  lunch: { label: "Lunch" },
  dinner: { label: "Dinner" },
  snack: { label: "Snack" },
} as const;

type BudgetMeal = {
  recipe: Recipe;
  estimatedCost: number | null;
  mealSlot: MealSlot;
  day: number;
  servings: number;
};

export function BudgetPlannerPane() {
  const db = useSQLiteContext();
  const [budget, setBudget] = useState("");
  const [isQuickSetupOpen, setIsQuickSetupOpen] = useState(false);
  const [plannedMeals, setPlannedMeals] = useState<BudgetMeal[]>([]);
  const [isAddingAll, setIsAddingAll] = useState(false);
  const budgetPlannerMutation = useBudgetPlannerMutation();
  const updatePreferencesMutation = useUpdatePreferencesMutation();
  const updateProfileAnswersMutation = useUpdateProfileAnswersMutation();
  const addShoppingListItemMutation = useAddShoppingListItemMutation();
  const addItems = useShoppingListStore((state) => state.addItems);
  const habitWho = useProfileAnswersStore((state) => state.habitWho);
  const habitTime = useProfileAnswersStore((state) => state.habitTime);
  const setProfileAnswers = useProfileAnswersStore(
    (state) => state.setProfileAnswers
  );
  const healthConditions = usePreferencesStore(
    (state) => state.healthConditions
  );
  const dietaryPreference = usePreferencesStore(
    (state) => state.dietaryPreference
  );
  const defaultUnitMode = usePreferencesStore(
    (state) => state.defaultUnitMode
  );
  const setDefaultServingSize = usePreferencesStore(
    (state) => state.setDefaultServingSize
  );

  useProfileAnswersQuery();

  const numericBudget = Number(budget);
  const savedServingSize = SERVINGS_BY_HABIT_WHO[habitWho ?? ""] ?? 1;
  const hasSavedQuickSetup =
    habitWho !== null &&
    habitTime !== null &&
    VALID_HABIT_WHO.has(habitWho) &&
    VALID_HABIT_TIME.has(habitTime);
  const totalSpend =
    budgetPlannerMutation.data?.totalEstimatedCost ??
    plannedMeals.reduce(
      (total, meal) => total + (meal.estimatedCost ?? 0),
      0
    );
  const totalBudget = numericBudget;
  const budgetUsagePercent =
    totalBudget > 0 ? Math.min(100, (totalSpend / totalBudget) * 100) : 0;
  const isWithinBudget = totalBudget > 0 && totalSpend <= totalBudget;

  useEffect(() => {
    const meals =
      budgetPlannerMutation.data?.meals.map((meal) => ({
        recipe: apiRecipeToLocalRecipe(meal.recipe),
        estimatedCost: meal.estimatedCost,
        mealSlot: meal.mealSlot,
        day: meal.day,
        servings: meal.servings ?? savedServingSize,
      })) ?? [];

    setPlannedMeals(sortMealsBySlot(meals));
  }, [budgetPlannerMutation.data, savedServingSize]);

  function requestBudgetPlan(
    nextBudget: number,
    setup: QuickPlanSetupValue = {
      habitWho: habitWho ?? "",
      habitTime: habitTime ?? "",
    }
  ) {
    if (!nextBudget || nextBudget < 1000) return;

    const servingSize = SERVINGS_BY_HABIT_WHO[setup.habitWho] ?? 1;
    const timeCap =
      TIME_CAP_BY_HABIT[setup.habitTime] ?? Number.POSITIVE_INFINITY;

    budgetPlannerMutation.mutate(
      {
        budget: nextBudget,
        servingSize,
        maxTotalTimeMinutes: Number.isFinite(timeCap) ? timeCap : null,
        dietaryPreference,
        healthConditions,
        allowUnknownCost: false,
      }
    );
  }

  function updateBudget(value: string) {
    setBudget(value.replace(/[^0-9]/g, ""));
    budgetPlannerMutation.reset();
  }

  function openPlanSetup() {
    Keyboard.dismiss();
    setIsQuickSetupOpen(true);
  }

  function startCreatingPlan() {
    Keyboard.dismiss();

    if (numericBudget < 1000) {
      showToast("Enter a daily budget to continue");
      return;
    }

    if (hasSavedQuickSetup) {
      requestBudgetPlan(numericBudget);
      return;
    }

    setIsQuickSetupOpen(true);
  }

  function handleQuickSetupComplete(value: QuickPlanSetupValue) {
    const defaultServingSize = SERVINGS_BY_HABIT_WHO[value.habitWho] ?? 1;

    setProfileAnswers(value);
    setDefaultServingSize(defaultServingSize);
    setIsQuickSetupOpen(false);

    updateProfileAnswersMutation.mutate(value);
    updatePreferencesMutation.mutate({
      healthConditions,
      dietaryPreference,
      defaultUnitMode,
      defaultServingSize,
    });

    requestBudgetPlan(numericBudget, value);
  }

  async function handleAddAllToShoppingList() {
    if (plannedMeals.length === 0 || isAddingAll) return;

    setIsAddingAll(true);

    try {
      const recipeDetails = await Promise.all(
        plannedMeals.map((meal) => recipesApi.getRecipeById(meal.recipe.id))
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
      router.push({
        pathname: "/shopping/[id]",
        params: { id: DEFAULT_SHOPPING_LIST_ID },
      });
    } catch (error) {
      console.error("Failed to add budget plan to shopping list", error);
    } finally {
      setIsAddingAll(false);
    }
  }

  function openMealSwap(sourceRecipeId: string) {
    const sourceMeal = plannedMeals.find(
      (meal) => meal.recipe.id === sourceRecipeId
    );

    if (!sourceMeal || plannedMeals.length < 2) {
      return;
    }

    openSheet(
      <MealSwapSheet
        sourceMeal={sourceMeal}
        meals={plannedMeals}
        onSelect={(targetRecipeId) => {
          setPlannedMeals((current) =>
            swapMealSlots(current, sourceRecipeId, targetRecipeId)
          );
          closeSheet();
          showToast("Meals swapped!", "success");
        }}
      />
    );
  }

  return (
    <View style={styles.container}>
      <Pressable
        onPress={openPlanSetup}
        style={({ pressed }) => [
          styles.setupCard,
          pressed && styles.pressed,
        ]}
      >
        <LinearGradient
          colors={["#1D3327", "#152119"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFillObject}
        />

        <View style={styles.setupIconWrap}>
          <Icon name="plan" size={19} color={theme.colors.accent} />
        </View>

        <View style={styles.setupInfo}>
          <AppText style={styles.setupText}>
            {VALID_HABIT_WHO.has(habitWho ?? "") &&
            VALID_HABIT_TIME.has(habitTime ?? "")
              ? `${savedServingSize} ${
                  savedServingSize === 1 ? "person" : "people"
                } · ${TIME_LABEL_BY_HABIT[habitTime ?? ""]}`
              : "Set portions and cook time"}
          </AppText>
          <AppText style={styles.setupHint}>
            Tap to edit portions and cook time
          </AppText>
        </View>
      </Pressable>

      <AppText style={styles.inputLabel}>Daily Budget</AppText>

      <View style={styles.inputRow}>
        <AppText style={styles.naira}>₦</AppText>

        <TextInput
          value={budget}
          onChangeText={updateBudget}
          placeholder="0"
          keyboardType="number-pad"
          returnKeyType="done"
          onSubmitEditing={Keyboard.dismiss}
          placeholderTextColor={theme.colors.textDim}
          style={styles.input}
        />
      </View>

      <View style={styles.presets}>
        {BUDGET_PRESETS.map((preset) => {
          const isActive = numericBudget === preset;

          return (
            <Pressable
              key={preset}
              onPress={() => updateBudget(String(preset))}
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

      <Pressable
        onPress={startCreatingPlan}
        disabled={budgetPlannerMutation.isPending}
        style={({ pressed }) => [
          styles.generateButton,
          pressed && styles.pressed,
          budgetPlannerMutation.isPending && styles.disabledButton,
        ]}
      >
        <LinearGradient
          colors={["#1D3327", "#0F1B12"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFillObject}
        />
        <AppText style={styles.generateButtonText}>
          {budgetPlannerMutation.isPending
            ? "Creating Plan..."
            : "Create My Meal Plan"}
        </AppText>
      </Pressable>

      <QuickPlanSetupModal
        visible={isQuickSetupOpen}
        isFirstPlan={!hasSavedQuickSetup}
        initialValue={{
          habitWho:
            habitWho !== null && VALID_HABIT_WHO.has(habitWho) ? habitWho : "",
          habitTime:
            habitTime !== null && VALID_HABIT_TIME.has(habitTime)
              ? habitTime
              : "",
        }}
        onClose={() => setIsQuickSetupOpen(false)}
        onComplete={handleQuickSetupComplete}
      />

      {budgetPlannerMutation.isPending ? (
        <View style={styles.loadingPanel}>
          <ProgressLoader
            variant="screen"
            messages={MEAL_PLAN_LOADING_MESSAGES}
          />
        </View>
      ) : null}

      {budgetPlannerMutation.isError ? (
        <EmptyState
          icon="⚠️"
          title="Could not generate plan"
          message={getApiErrorMessage(budgetPlannerMutation.error)}
        />
      ) : !numericBudget || budgetPlannerMutation.isPending ? null : !budgetPlannerMutation.data ? null : plannedMeals.length === 0 ? (
        <EmptyState
          icon="😔"
          title="No meals found"
          message={budgetPlannerMutation.data.message}
        />
      ) : (
        <View style={styles.results}>
          <View style={styles.resultsHeader}>
            <AppText style={styles.resultsTitle}>Today&apos;s Meal Plan</AppText>
          </View>

          {plannedMeals.length < 3 ? (
            <AppText style={styles.plannerMessage}>
              {budgetPlannerMutation.data.message}
            </AppText>
          ) : null}

          {plannedMeals.map(({ recipe, estimatedCost, mealSlot, day }) => {
            const mealMeta = MEAL_SLOT_META[mealSlot] ?? MEAL_SLOT_META.snack;

            return (
              <View
                key={`${day}-${mealSlot}-${recipe.id}`}
                style={styles.mealRow}
              >
                <Pressable
                  onPress={() =>
                    router.push({
                      pathname: "/recipes/[id]",
                      params: { id: recipe.id },
                    })
                  }
                  style={({ pressed }) => [
                    styles.mealMain,
                    pressed && styles.pressed,
                  ]}
                >
                  <RecipePhoto
                    imageUrl={recipe.imageUrl}
                    style={styles.mealThumb}
                  />

                  <View style={styles.mealInfo}>
                    <AppText style={styles.mealSlotLabel}>
                      {mealMeta.label}
                    </AppText>
                    <AppText style={styles.mealName} numberOfLines={1}>
                      {recipe.name}
                    </AppText>
                    <AppText style={styles.mealMeta}>
                      {recipe.time}
                      {estimatedCost !== null
                        ? ` · ${formatNaira(estimatedCost)}`
                        : ""}
                    </AppText>
                  </View>
                </Pressable>

                <Pressable
                  onPress={() => openMealSwap(recipe.id)}
                  style={({ pressed }) => [
                    styles.swapButton,
                    pressed && styles.pressed,
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel={`Swap ${mealMeta.label} meal`}
                >
                  <Icon name="swap" size={16} color={theme.colors.text} />
                </Pressable>
              </View>
            );
          })}

          <View style={styles.totalCard}>
            <View>
              <AppText style={styles.totalLabel}>Total plan cost</AppText>
              <AppText style={styles.totalValue}>
                {formatNaira(totalSpend)}
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
                {isAddingAll ? "Adding..." : "Add All to List"}
              </AppText>
            </Pressable>
          </View>

          <View style={styles.budgetStatusRow}>
            <View style={styles.progressTrack}>
              <View
                style={[styles.progressFill, { width: `${budgetUsagePercent}%` }]}
              />
            </View>
            <AppText
              style={[
                styles.progressText,
                !isWithinBudget && styles.progressTextOver,
              ]}
            >
              {Math.round(budgetUsagePercent)}% of budget used
              {isWithinBudget ? "" : " · over budget"}
            </AppText>
          </View>
        </View>
      )}
    </View>
  );
}

function MealSwapSheet({
  sourceMeal,
  meals,
  onSelect,
}: {
  sourceMeal: BudgetMeal;
  meals: BudgetMeal[];
  onSelect: (recipeId: string) => void;
}) {
  return (
    <View style={styles.swapSheet}>
      <AppText style={styles.swapSheetTitle}>Swap Meal</AppText>
      <AppText style={styles.swapSheetDescription}>
        Choose a meal to swap with {sourceMeal.recipe.name}.
      </AppText>

      {meals
        .filter((meal) => meal.recipe.id !== sourceMeal.recipe.id)
        .map((meal, index, options) => {
          const mealMeta =
            MEAL_SLOT_META[meal.mealSlot] ?? MEAL_SLOT_META.snack;

          return (
            <Pressable
              key={meal.recipe.id}
              onPress={() => onSelect(meal.recipe.id)}
              style={({ pressed }) => [
                styles.swapSheetRow,
                index === options.length - 1 && styles.swapSheetRowLast,
                pressed && styles.pressed,
              ]}
            >
              <RecipePhoto
                imageUrl={meal.recipe.imageUrl}
                style={styles.swapSheetThumb}
              />

              <View style={styles.swapSheetInfo}>
                <AppText style={styles.swapSheetSlot}>
                  {mealMeta.label}
                </AppText>
                <AppText style={styles.swapSheetName} numberOfLines={1}>
                  {meal.recipe.name}
                </AppText>
              </View>

              <Icon name="swap" size={16} color={theme.colors.textMuted} />
            </Pressable>
          );
        })}
    </View>
  );
}

function swapMealSlots(
  meals: BudgetMeal[],
  sourceRecipeId: string,
  targetRecipeId: string
) {
  const sourceIndex = meals.findIndex(
    (meal) => meal.recipe.id === sourceRecipeId
  );
  const targetIndex = meals.findIndex(
    (meal) => meal.recipe.id === targetRecipeId
  );

  if (sourceIndex < 0 || targetIndex < 0) {
    return meals;
  }

  const next = meals.map((meal) => ({ ...meal }));
  const sourceSlot = next[sourceIndex].mealSlot;
  next[sourceIndex].mealSlot = next[targetIndex].mealSlot;
  next[targetIndex].mealSlot = sourceSlot;

  return sortMealsBySlot(next);
}

function sortMealsBySlot(meals: BudgetMeal[]) {
  return [...meals].sort(
    (mealA, mealB) =>
      MEAL_SLOT_ORDER.indexOf(mealA.mealSlot) -
      MEAL_SLOT_ORDER.indexOf(mealB.mealSlot)
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
  },
  pressed: {
    opacity: 0.9,
  },
  disabledButton: {
    opacity: 0.5,
  },
  loadingPanel: {
    height: 360,
    overflow: "hidden",
    backgroundColor: theme.colors.white,
  },
  setupCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderRadius: 18,
    paddingHorizontal: 18,
    paddingVertical: 16,
    marginBottom: 22,
    overflow: "hidden",
    shadowColor: theme.colors.navy,
    shadowOffset: { width: 0, height: 7 },
    shadowOpacity: 0.2,
    shadowRadius: 13,
    elevation: 4,
  },
  setupIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 11,
    backgroundColor: "rgba(227,166,46,0.18)",
    alignItems: "center",
    justifyContent: "center",
  },
  setupInfo: {
    flex: 1,
  },
  setupText: {
    fontFamily: theme.fontFamily.bodySemiBold,
    fontSize: 14,
    lineHeight: 18,
    color: theme.colors.onDark,
  },
  setupHint: {
    fontFamily: theme.fontFamily.mono,
    fontSize: 12,
    color: "#9FB0A3",
    marginTop: 3,
  },
  inputLabel: {
    fontFamily: theme.fontFamily.monoMedium,
    fontSize: 12,
    color: theme.colors.textMuted,
    letterSpacing: 1,
    textTransform: "uppercase",
    marginBottom: 10,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 6,
    marginBottom: 20,
  },
  naira: {
    fontFamily: theme.fontFamily.display,
    fontSize: 36,
    color: theme.colors.linkGreen,
  },
  input: {
    flex: 1,
    fontFamily: theme.fontFamily.display,
    fontSize: 36,
    color: theme.colors.navy,
    paddingVertical: 0,
  },
  presets: {
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap",
    marginBottom: 26,
  },
  presetButton: {
    flex: 1,
    minWidth: 76,
    minHeight: 46,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.card,
  },
  activePresetButton: {
    borderColor: theme.colors.navy,
    backgroundColor: theme.colors.navy,
  },
  presetLabel: {
    fontFamily: theme.fontFamily.bodyBold,
    fontSize: 13,
    color: theme.colors.text,
  },
  activePresetLabel: {
    color: theme.colors.onDark,
  },
  generateButton: {
    height: 58,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    marginBottom: theme.spacing.xl,
    shadowColor: theme.colors.navy,
    shadowOffset: { width: 0, height: 9 },
    shadowOpacity: 0.22,
    shadowRadius: 15,
    elevation: 5,
  },
  generateButtonText: {
    fontFamily: theme.fontFamily.bodyBold,
    fontSize: 15.5,
    color: theme.colors.onDark,
  },
  results: {
    marginBottom: theme.spacing.md,
  },
  resultsHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  resultsTitle: {
    fontFamily: theme.fontFamily.monoMedium,
    fontSize: 12,
    color: theme.colors.textMedium,
    textTransform: "uppercase",
  },
  plannerMessage: {
    fontFamily: theme.fontFamily.body,
    fontSize: 13,
    lineHeight: 19,
    color: theme.colors.textMedium,
    marginBottom: 8,
  },
  dayChipRow: {
    gap: 8,
    paddingBottom: 16,
  },
  dayChip: {
    paddingHorizontal: 20,
    paddingVertical: 11,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.card,
  },
  dayChipActive: {
    borderColor: theme.colors.navy,
    backgroundColor: theme.colors.navy,
  },
  dayChipText: {
    fontFamily: theme.fontFamily.monoBold,
    fontSize: 14,
    letterSpacing: 0.5,
    textTransform: "uppercase",
    color: theme.colors.textMedium,
  },
  dayChipTextActive: {
    color: "#C7CCC0",
  },
  mealRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  mealMain: {
    flex: 1,
    minWidth: 0,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  mealThumb: {
    width: 64,
    height: 64,
    borderRadius: 16,
  },
  mealInfo: {
    flex: 1,
    minWidth: 0,
  },
  mealSlotLabel: {
    fontFamily: theme.fontFamily.monoBold,
    fontSize: 11.5,
    letterSpacing: 0.6,
    textTransform: "uppercase",
    color: theme.colors.goldText,
    marginBottom: 4,
  },
  mealName: {
    fontFamily: theme.fontFamily.bodySemiBold,
    fontSize: 15,
    lineHeight: 19,
    color: theme.colors.text,
  },
  mealMeta: {
    fontFamily: theme.fontFamily.mono,
    fontSize: 12.5,
    color: theme.colors.textMedium,
    marginTop: 5,
  },
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
    backgroundColor: theme.colors.card2,
    borderRadius: 16,
    padding: 14,
    paddingHorizontal: 16,
    marginTop: 16,
  },
  totalLabel: {
    fontFamily: theme.fontFamily.mono,
    fontSize: 11.5,
    color: theme.colors.text,
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  totalValue: {
    fontFamily: theme.fontFamily.display,
    fontSize: 19,
    color: theme.colors.navy3,
    marginTop: 2,
  },
  addAllButton: {
    backgroundColor: theme.colors.navy,
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 11,
  },
  addAllText: {
    fontFamily: theme.fontFamily.bodySemiBold,
    fontSize: 12.5,
    color: theme.colors.onDark,
  },
  budgetStatusRow: {
    marginTop: 16,
  },
  progressTrack: {
    height: 6,
    borderRadius: 999,
    backgroundColor: theme.colors.card2,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 999,
    backgroundColor: theme.colors.green,
  },
  progressText: {
    fontFamily: theme.fontFamily.mono,
    fontSize: 11.5,
    color: theme.colors.textMuted,
    marginTop: 7,
  },
  progressTextOver: {
    color: theme.colors.red,
  },
  swapSheet: {
    paddingBottom: 24,
  },
  swapSheetTitle: {
    fontFamily: theme.fontFamily.display,
    fontSize: 19,
    color: theme.colors.text,
    marginBottom: 4,
  },
  swapSheetDescription: {
    fontFamily: theme.fontFamily.body,
    fontSize: 13,
    lineHeight: 19,
    color: theme.colors.textMedium,
    marginBottom: 14,
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
  swapSheetRowLast: {
    borderBottomWidth: 0,
  },
  swapSheetThumb: {
    width: 44,
    height: 44,
    borderRadius: 8,
  },
  swapSheetInfo: {
    flex: 1,
    minWidth: 0,
  },
  swapSheetSlot: {
    fontFamily: theme.fontFamily.monoBold,
    fontSize: 11,
    color: theme.colors.goldText,
    textTransform: "uppercase",
  },
  swapSheetName: {
    fontFamily: theme.fontFamily.bodySemiBold,
    fontSize: 14,
    color: theme.colors.text,
    marginTop: 3,
  },
});
