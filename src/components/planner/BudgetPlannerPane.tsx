import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { useState } from "react";
import {
  Keyboard,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import type { Recipe } from "../../data/recipes";
import { insertShoppingListItems } from "../../db/shoppingListRepository";
import {
  useBudgetPlannerMutation,
  usePlannerSettingsQuery,
  useUpdatePlannerSettingsMutation,
} from "../../hooks/api/usePlanner";
import { useUpdatePreferencesMutation } from "../../hooks/api/usePreferences";
import {
  useProfileAnswersQuery,
  useUpdateProfileAnswersMutation,
} from "../../hooks/api/useProfileAnswers";
import { useAddShoppingListItemMutation } from "../../hooks/api/useShoppingList";
import { apiRecipeToLocalRecipe } from "../../lib/api/adapters";
import {
  getApiErrorMessage,
  toApiClientError,
} from "../../lib/api/errors";
import { recipesApi } from "../../lib/api";
import { formatNaira } from "../../lib/formatters";
import { scaleAmountText } from "../../lib/scaling";
import {
  generateShoppingListItemsFromRecipe,
  isPurchasableRecipeIngredient,
} from "../../lib/shoppingListGenerator";
import { usePreferencesStore } from "../../store/preferencesStore";
import { usePlannerStore } from "../../store/plannerStore";
import { useProfileAnswersStore } from "../../store/profileAnswersStore";
import { useShoppingListStore } from "../../store/shoppingListStore";
import { closeSheet, openSheet, showToast } from "../../store/uiStore";
import { theme } from "../../theme/theme";
import type { MealSlot } from "../../types/api";
import type { PlanSetupValue } from "../../types/planner";
import { DEFAULT_SHOPPING_LIST_ID } from "../../types/shoppingList";
import { RecipePhoto } from "../recipe/RecipePhoto";
import { AppText } from "../ui/AppText";
import { EmptyState } from "../ui/EmptyState";
import { Icon } from "../ui/Icon";
import { ProgressLoader } from "../ui/ProgressLoader";
import { PlanSetupModal } from "./PlanSetupModal";
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
  const [isPlanSetupOpen, setIsPlanSetupOpen] = useState(false);
  const [isQuickSetupOpen, setIsQuickSetupOpen] = useState(false);
  const [plannedMeals, setPlannedMeals] = useState<BudgetMeal[]>([]);
  const [selectedDay, setSelectedDay] = useState(1);
  const [isAddingAll, setIsAddingAll] = useState(false);
  const budgetPlannerMutation = useBudgetPlannerMutation();
  const updatePlannerSettingsMutation =
    useUpdatePlannerSettingsMutation();
  const updatePreferencesMutation = useUpdatePreferencesMutation();
  const updateProfileAnswersMutation = useUpdateProfileAnswersMutation();
  const addShoppingListItemMutation = useAddShoppingListItemMutation();
  const addItems = useShoppingListStore((state) => state.addItems);
  const planSetup = usePlannerStore((state) => state.planSetup);
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
  usePlannerSettingsQuery();

  const numericBudget = Number(budget);
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
  const visibleMeals = plannedMeals.filter(
    (meal) => meal.day === selectedDay
  );
  const resultDays =
    budgetPlannerMutation.data?.days ?? planSetup.days;
  const isPlanResultPreparing =
    budgetPlannerMutation.isPending ||
    (Boolean(budgetPlannerMutation.data?.meals.length) &&
      plannedMeals.length === 0);

  function requestBudgetPlan(
    nextBudget: number,
    setup: QuickPlanSetupValue = {
      habitWho: habitWho ?? "",
      habitTime: habitTime ?? "",
    },
    avoidRecipeIds: string[] = []
  ) {
    if (!nextBudget || nextBudget < 1000) return;

    const servingSize = SERVINGS_BY_HABIT_WHO[setup.habitWho] ?? 1;
    const timeCap =
      TIME_CAP_BY_HABIT[setup.habitTime] ?? Number.POSITIVE_INFINITY;

    setPlannedMeals([]);
    setSelectedDay(1);
    budgetPlannerMutation.mutate(
      {
        budget: nextBudget,
        days: planSetup.days,
        mealSlots: planSetup.mealSlots,
        mealsPerDay: planSetup.mealSlots.length,
        servingSize,
        ...(Number.isFinite(timeCap)
          ? { maxTotalTimeMinutes: timeCap }
          : {}),
        dietaryPreference,
        healthConditions,
        allowUnknownCost: false,
        avoidRecipeIds,
      },
      {
        onSuccess: (data) => {
          setPlannedMeals(
            sortMealsBySlot(
              data.meals.map((meal) => ({
                recipe: apiRecipeToLocalRecipe(meal.recipe),
                estimatedCost: meal.estimatedCost,
                mealSlot: meal.mealSlot,
                day: meal.day,
                servings: meal.servings ?? servingSize,
              }))
            )
          );
          setSelectedDay(1);
        },
      }
    );
  }

  function updateBudget(value: string) {
    setBudget(value.replace(/[^0-9]/g, ""));
    setPlannedMeals([]);
    budgetPlannerMutation.reset();
  }

  function openPlanSetup() {
    Keyboard.dismiss();
    setIsPlanSetupOpen(true);
  }

  function handlePlanSetupComplete(value: PlanSetupValue) {
    setIsPlanSetupOpen(false);
    setPlannedMeals([]);
    budgetPlannerMutation.reset();
    updatePlannerSettingsMutation.mutate(
      {
        ...value,
        mealsPerDay: value.mealSlots.length,
      },
      {
        onSuccess: () => {
          showToast(
            "Plan updated, tap Generate to build your new plan",
            "success"
          );
        },
        onError: (error) => {
          if (toApiClientError(error).status === 0) {
            showToast(
              "Plan saved on this device. We'll sync it when you're online.",
              "success"
            );
            return;
          }

          showToast(getApiErrorMessage(error));
        },
      }
    );
  }

  function startCreatingPlan() {
    Keyboard.dismiss();

    if (numericBudget < 1000) {
      showToast("Enter a total plan budget to continue");
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
      const planRecipes = await Promise.all(
        plannedMeals.map(async (meal) => ({
          meal,
          recipeDetail: await recipesApi.getRecipeById(meal.recipe.id),
        }))
      );

      await Promise.all(
        planRecipes.flatMap(({ meal, recipeDetail }) =>
          recipeDetail.ingredients
            .filter(isPurchasableRecipeIngredient)
            .map((ingredient) => {
              const selectedUnit = ingredient.availableUnits[0];
              const baseAmount =
                selectedUnit?.label ??
                ingredient.displayText ??
                ingredient.quantityText ??
                ingredient.rawText;

              return addShoppingListItemMutation.mutateAsync({
                recipeId: recipeDetail.id,
                name:
                  ingredient.ingredientName ??
                  ingredient.canonicalIngredientName ??
                  ingredient.rawText,
                canonicalIngredientName: ingredient.canonicalIngredientName,
                emoji: null,
                quantity: scaleAmountText({
                  amount: baseAmount,
                  baseServings:
                    recipeDetail.baseServings ?? meal.servings,
                  selectedServings: meal.servings,
                }),
                unit: selectedUnit?.unit ?? ingredient.unit,
                category: ingredient.category,
                estimatedPrice: null,
              });
            })
        )
      );

      const localItems = planRecipes.flatMap(({ meal, recipeDetail }) => {
        const recipe = apiRecipeToLocalRecipe(recipeDetail);

        return generateShoppingListItemsFromRecipe({
          recipe,
          selectedServings: meal.servings,
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

  function openMealSwap(sourcePosition: string) {
    const sourceMeal = plannedMeals.find(
      (meal) => getMealPositionKey(meal) === sourcePosition
    );

    if (!sourceMeal || plannedMeals.length < 2) {
      return;
    }

    openSheet(
      <MealSwapSheet
        sourceMeal={sourceMeal}
        meals={plannedMeals}
        onSelect={(targetPosition) => {
          setPlannedMeals((current) =>
            swapMealAssignments(current, sourcePosition, targetPosition)
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
            {formatPlanSetupSummary(planSetup)}
          </AppText>
          <AppText style={styles.setupHint}>Tap to edit your plan</AppText>
        </View>
      </Pressable>

      <AppText style={styles.inputLabel}>Total Plan Budget</AppText>

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
          Create My Meal Plan
        </AppText>
      </Pressable>

      <PlanSetupModal
        visible={isPlanSetupOpen}
        initialValue={planSetup}
        onClose={() => setIsPlanSetupOpen(false)}
        onComplete={handlePlanSetupComplete}
      />

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

      {isPlanResultPreparing ? (
        <View style={styles.loadingPanel}>
          <ProgressLoader variant="screen" />
        </View>
      ) : null}

      {budgetPlannerMutation.isError ? (
        <EmptyState
          iconName="offline"
          title="Could not generate plan"
          message={getApiErrorMessage(budgetPlannerMutation.error)}
        />
      ) : !numericBudget || isPlanResultPreparing ? null : !budgetPlannerMutation.data ? null : plannedMeals.length === 0 ? (
        <EmptyState
          iconName="plan"
          title="No meals found"
          message="No meals matched this setup and total plan budget."
        />
      ) : (
        <View style={styles.results}>
          {resultDays > 1 ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.dayChipRow}
            >
              {Array.from({ length: resultDays }, (_, index) => index + 1).map(
                (day) => {
                  const active = selectedDay === day;

                  return (
                    <Pressable
                      key={day}
                      onPress={() => setSelectedDay(day)}
                      style={[
                        styles.dayChip,
                        active && styles.dayChipActive,
                      ]}
                    >
                      <AppText
                        style={[
                          styles.dayChipText,
                          active && styles.dayChipTextActive,
                        ]}
                      >
                        Day {day}
                      </AppText>
                    </Pressable>
                  );
                }
              )}
            </ScrollView>
          ) : null}

          {visibleMeals.length === 0 ? (
            <AppText style={styles.emptyDayText}>
              No meals were available for Day {selectedDay}.
            </AppText>
          ) : null}

          {visibleMeals.map(({ recipe, estimatedCost, mealSlot, day }) => {
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
                  onPress={() =>
                    openMealSwap(getMealPositionKey({ mealSlot, day }))
                  }
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
  onSelect: (position: string) => void;
}) {
  const sourceMeta =
    MEAL_SLOT_META[sourceMeal.mealSlot] ?? MEAL_SLOT_META.snack;
  const sourcePosition = getMealPositionKey(sourceMeal);
  const choices = meals.filter(
    (meal) => getMealPositionKey(meal) !== sourcePosition
  );

  return (
    <View style={styles.swapSheet}>
      <View style={styles.swapSheetHeader}>
        <AppText style={styles.swapSheetTitle}>Swap Meal</AppText>
        <AppText style={styles.swapSheetDescription}>
          Choose a meal to swap with{" "}
          <AppText style={styles.swapSheetSourceName}>
            {sourceMeal.recipe.name}
          </AppText>{" "}
          (Day {sourceMeal.day} · {sourceMeta.label})
        </AppText>
      </View>

      <ScrollView
        style={styles.swapSheetList}
        showsVerticalScrollIndicator={false}
        nestedScrollEnabled
      >
        {choices.length === 0 ? (
          <AppText style={styles.swapSheetEmpty}>
            No other meals to swap with.
          </AppText>
        ) : null}

        {choices.map((meal, index) => {
          const mealMeta =
            MEAL_SLOT_META[meal.mealSlot] ?? MEAL_SLOT_META.snack;

          return (
            <Pressable
              key={getMealPositionKey(meal)}
              onPress={() => onSelect(getMealPositionKey(meal))}
              style={({ pressed }) => [
                styles.swapSheetRow,
                index === choices.length - 1 && styles.swapSheetRowLast,
                pressed && styles.pressed,
              ]}
            >
              <RecipePhoto
                imageUrl={meal.recipe.imageUrl}
                style={styles.swapSheetThumb}
              />

              <View style={styles.swapSheetInfo}>
                <AppText style={styles.swapSheetSlot}>
                  Day {meal.day} · {mealMeta.label}
                </AppText>
                <AppText style={styles.swapSheetName} numberOfLines={1}>
                  {meal.recipe.name}
                </AppText>
              </View>

              <Icon name="swap" size={16} color={theme.colors.textMuted} />
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

function getMealPositionKey(meal: Pick<BudgetMeal, "day" | "mealSlot">) {
  return `${meal.day}:${meal.mealSlot}`;
}

function swapMealAssignments(
  meals: BudgetMeal[],
  sourcePosition: string,
  targetPosition: string
) {
  const sourceIndex = meals.findIndex(
    (meal) => getMealPositionKey(meal) === sourcePosition
  );
  const targetIndex = meals.findIndex(
    (meal) => getMealPositionKey(meal) === targetPosition
  );

  if (sourceIndex < 0 || targetIndex < 0) {
    return meals;
  }

  const next = meals.map((meal) => ({ ...meal }));
  const sourceMeal = next[sourceIndex];
  const targetMeal = next[targetIndex];

  next[sourceIndex] = {
    ...targetMeal,
    day: sourceMeal.day,
    mealSlot: sourceMeal.mealSlot,
  };
  next[targetIndex] = {
    ...sourceMeal,
    day: targetMeal.day,
    mealSlot: targetMeal.mealSlot,
  };

  return sortMealsBySlot(next);
}

function sortMealsBySlot(meals: BudgetMeal[]) {
  return [...meals].sort(
    (mealA, mealB) =>
      mealA.day - mealB.day ||
      MEAL_SLOT_ORDER.indexOf(mealA.mealSlot) -
        MEAL_SLOT_ORDER.indexOf(mealB.mealSlot)
  );
}

function formatPlanSetupSummary(value: PlanSetupValue) {
  const days = `${value.days} ${value.days === 1 ? "Day" : "Days"}`;
  const meals =
    value.mealSlots.length === 3
      ? "Breakfast, Lunch & Dinner"
      : value.mealSlots.map(capitalize).join(" & ");
  const totalMeals = value.days * value.mealsPerDay;

  return `${days} · ${meals} · ${totalMeals} ${
    totalMeals === 1 ? "Meal" : "Meals"
  }`;
}

function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
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
  emptyDayText: {
    fontFamily: theme.fontFamily.body,
    fontSize: 13.5,
    lineHeight: 20,
    color: theme.colors.textMedium,
    paddingVertical: 24,
    textAlign: "center",
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
  swapSheet: {
    paddingBottom: 24,
  },
  swapSheetHeader: {
    flexShrink: 0,
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
  swapSheetSourceName: {
    fontFamily: theme.fontFamily.bodyBold,
    color: theme.colors.text,
  },
  swapSheetList: {
    maxHeight: 360,
  },
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
