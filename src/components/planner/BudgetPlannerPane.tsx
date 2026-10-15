import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { useEffect, useRef, useState } from "react";
import {
  Keyboard,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import { useBudgetPlannerMutation, usePlannerSettingsQuery } from "../../hooks/api/usePlanner";
import { useProfileAnswersQuery } from "../../hooks/api/useProfileAnswers";
import { usePlanCommands, useSavedPlans } from "../../hooks/useSavedPlans";
import { useAddPlanToList } from "../../hooks/useAddPlanToList";
import { useSettingsCommands } from "../../hooks/useSettingsCommands";
import { apiRecipeToLocalRecipe } from "../../lib/api/adapters";
import { getApiErrorMessage } from "../../lib/api/errors";
import { formatNaira } from "../../lib/formatters";
import { openRecipe } from "../../lib/navigation/openRecipe";
import {
  SERVINGS_BY_HABIT_WHO,
  TIME_CAP_BY_HABIT,
  VALID_HABIT_TIME,
  VALID_HABIT_WHO,
} from "../../lib/plannerQuickSetup";
import { currentPlanId, nextPlanName } from "../../lib/planner/planCommands";
import { getPlannerDraft, savePlannerDraft, type DraftMeal, type PlannerDraft } from "../../lib/planner/plannerDraft";
import { useAuthStore } from "../../store/authStore";
import { usePreferencesStore } from "../../store/preferencesStore";
import { usePlannerStore } from "../../store/plannerStore";
import { useProfileAnswersStore } from "../../store/profileAnswersStore";
import { closeSheet, openSheet, showToast } from "../../store/uiStore";
import { theme } from "../../theme/theme";
import type { BudgetPlannerResponse, MealSlot } from "../../types/api";
import type { PlanSetupValue } from "../../types/planner";
import { AppText } from "../ui/AppText";
import { EmptyState } from "../ui/EmptyState";
import { Icon } from "../ui/Icon";
import { PlanMeals } from "./PlanMeals";
import { PlanNameSheet, SavePlanFirstSheet } from "./PlanSheets";
import { PlanSetupModal } from "./PlanSetupModal";
import { BudgetPlanSkeleton } from "./BudgetPlanSkeleton";
import { BudgetShortfallSheet } from "./BudgetShortfallSheet";
import {
  QuickPlanSetupModal,
  QuickPlanSetupValue,
} from "./QuickPlanSetupModal";

const BUDGET_PRESETS = [3000, 5000, 10000, 15000];
const MEAL_SLOT_ORDER: MealSlot[] = ["breakfast", "lunch", "dinner", "snack"];

type BudgetMeal = DraftMeal;

export function BudgetPlannerPane() {
  const db = useSQLiteContext();
  const [budget, setBudget] = useState("");
  const [isPlanSetupOpen, setIsPlanSetupOpen] = useState(false);
  const [isQuickSetupOpen, setIsQuickSetupOpen] = useState(false);
  const [plannedMeals, setPlannedMeals] = useState<BudgetMeal[]>([]);
  const [savedPlanId, setSavedPlanId] = useState<string | null>(null);
  const [planInfo, setPlanInfo] = useState<PlannerDraft["info"]>(null);
  const [draftLoaded, setDraftLoaded] = useState(false);
  const userId = useAuthStore((state) => state.user?.id ?? "");
  const { plans: savedPlans } = useSavedPlans();
  const planCommands = usePlanCommands();
  const generationRequestRef = useRef(0);
  const budgetPlannerMutation = useBudgetPlannerMutation();
  const settings = useSettingsCommands();
  const { addPlanToList, isAdding } = useAddPlanToList();
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
  // The plan on the planner stays until a new one is made, even after the
  // app is closed (MP-01).
  useEffect(() => {
    if (!userId) return;
    let active = true;
    void getPlannerDraft(db, userId).then((draft) => {
      if (!active) return;
      if (draft) {
        setBudget(draft.budget);
        setPlannedMeals(draft.meals);
        setPlanInfo(draft.info);
        setSavedPlanId(draft.savedPlanId);
      }
      setDraftLoaded(true);
    });
    return () => {
      active = false;
    };
  }, [db, userId]);

  useEffect(() => {
    if (!draftLoaded || !userId) return;
    void savePlannerDraft(db, userId, { budget, meals: plannedMeals, info: planInfo, savedPlanId });
  }, [budget, db, draftLoaded, planInfo, plannedMeals, savedPlanId, userId]);

  // Once saved, the planner shows the saved plan itself, so a swap on its
  // own screen shows here too.
  const savedPlan = savedPlanId ? savedPlans.find((plan) => plan.id === savedPlanId) : undefined;
  useEffect(() => {
    if (!savedPlanId || savedPlan) return;
    // Saved offline: it now has the server's id. Deleted: it's no longer saved.
    void currentPlanId(db, savedPlanId).then((id) => {
      if (id !== savedPlanId) setSavedPlanId(id);
    });
  }, [db, savedPlan, savedPlanId]);

  const shownMeals: BudgetMeal[] = savedPlan
    ? savedPlan.items.flatMap((item) =>
        item.recipe
          ? [
              {
                planItemId: item.id,
                recipe: item.recipe,
                estimatedCost: item.estimatedCost,
                mealSlot: item.mealSlot,
                day: item.day,
                servings: item.servings,
              },
            ]
          : []
      )
    : plannedMeals;
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

    const requestId = ++generationRequestRef.current;
    const servingSize = SERVINGS_BY_HABIT_WHO[setup.habitWho] ?? 1;
    const timeCap =
      TIME_CAP_BY_HABIT[setup.habitTime] ?? Number.POSITIVE_INFINITY;

    setPlannedMeals([]);
    setSavedPlanId(null);
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
          if (
            data.recommendedBudget &&
            data.shortfall?.reason === "budget" &&
            data.generatedMealCount < data.requestedMealCount
          ) {
            setPlannedMeals([]);
            openSheet(
              <BudgetShortfallSheet
                currentBudget={nextBudget}
                recommendedBudget={data.recommendedBudget}
                days={data.days}
                mealSlots={data.mealSlots}
                onUseRecommended={() => {
                  closeSheet();
                  updateBudget(String(data.recommendedBudget));
                  showToast(
                    `Budget updated to ${formatNaira(data.recommendedBudget!)}`,
                    "success"
                  );
                  requestBudgetPlan(data.recommendedBudget!, setup, avoidRecipeIds);
                }}
                onKeepBudget={() => {
                  closeSheet();
                  void acceptBudgetPlan(
                    data,
                    nextBudget,
                    servingSize,
                    timeCap,
                    requestId
                  );
                }}
              />
            );
            return;
          }
          void acceptBudgetPlan(
            data,
            nextBudget,
            servingSize,
            timeCap,
            requestId
          );
        },
      }
    );
  }

  function acceptBudgetPlan(
    data: BudgetPlannerResponse,
    acceptedBudget: number,
    servingSize: number,
    timeCap: number,
    requestId: number
  ) {
    const generatedMeals = sortMealsBySlot(
      data.meals.map((meal) => ({
        recipe: meal.recipe,
        estimatedCost: meal.estimatedCost,
        mealSlot: meal.mealSlot,
        day: meal.day,
        servings: meal.servings ?? servingSize,
      }))
    );

    if (generationRequestRef.current !== requestId) return;
    // Kept on the phone until it's saved or replaced (MP-01).
    setPlannedMeals(generatedMeals);
    setSavedPlanId(null);
    setPlanInfo({
      plannerType: "budget",
      budget: acceptedBudget,
      servingSize,
      requestedMealCount: data.requestedMealCount,
      totalEstimatedCost: data.totalEstimatedCost,
      shortfallReason: data.shortfall?.reason ?? null,
      recommendedBudget: data.recommendedBudget,
      configuration: {
        days: data.days,
        mealSlots: data.mealSlots,
        ...(Number.isFinite(timeCap) ? { maxTotalTimeMinutes: timeCap } : {}),
        dietaryPreference,
        healthConditions,
      },
    });
  }

  function updateBudget(value: string) {
    generationRequestRef.current += 1;
    setBudget(value.replace(/[^0-9]/g, ""));
    budgetPlannerMutation.reset();
  }

  function openPlanSetup() {
    Keyboard.dismiss();
    setIsPlanSetupOpen(true);
  }

  function handlePlanSetupComplete(value: PlanSetupValue) {
    setIsPlanSetupOpen(false);
    // The plan on screen stays; the next one uses these settings.
    void settings.savePlannerSettings(value).then(() => {
      showToast("Your next plan will use these settings", "success");
    });
  }

  function startCreatingPlan() {
    Keyboard.dismiss();

    if (numericBudget < 1000) {
      showToast("Enter a total plan budget to continue");
      return;
    }

    // A plan isn't lost by mistake: one not saved asks first.
    if (shownMeals.length > 0 && !savedPlan) {
      openSheet(
        <SavePlanFirstSheet
          onDontSave={() => {
            closeSheet();
            createPlan();
          }}
          onSave={() => openSavePlanSheet(createPlan)}
        />
      );
      return;
    }
    createPlan();
  }

  function createPlan() {
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

    void settings.saveProfileAnswers(value);
    void settings.savePreferences({
      healthConditions,
      dietaryPreference,
      defaultUnitMode,
      defaultServingSize,
    });

    requestBudgetPlan(numericBudget, value);
  }

  // A meal is named by its id once the plan is saved, by its place before.
  const mealKey = (meal: BudgetMeal) => meal.planItemId ?? getMealPositionKey(meal);

  function handleMealSwap(sourceKey: string, targetKey: string) {
    const source = shownMeals.find((meal) => mealKey(meal) === sourceKey);
    const target = shownMeals.find((meal) => mealKey(meal) === targetKey);
    if (!source || !target) return;
    setPlannedMeals((current) =>
      swapMealAssignments(current, getMealPositionKey(source), getMealPositionKey(target))
    );
    // A swap on a saved plan saves straight away.
    if (savedPlan && source.planItemId && target.planItemId) {
      void planCommands.swapMeals({
        planId: savedPlan.id,
        sourceItemId: source.planItemId,
        targetItemId: target.planItemId,
      });
    }
    showToast("Meals swapped", "success");
  }

  function openSavePlanSheet(then?: () => void) {
    openSheet(
      <PlanNameSheet
        title="Save meal plan"
        initialName={nextPlanName(savedPlans.map((plan) => plan.name))}
        placeholder="e.g. This week’s meals"
        submitLabel="Save plan"
        onSubmit={(name) => void savePlan(name, then)}
      />
    );
  }

  async function savePlan(name: string, then?: () => void) {
    if (plannedMeals.length === 0) return;
    const info = planInfo ?? {
      plannerType: "budget" as const,
      budget: numericBudget || null,
      servingSize: plannedMeals[0].servings,
      requestedMealCount: plannedMeals.length,
      totalEstimatedCost: plannedMeals.reduce((sum, meal) => sum + (meal.estimatedCost ?? 0), 0),
      shortfallReason: null,
      recommendedBudget: null,
      configuration: {},
    };
    const plan = await planCommands.savePlan({
      draft: {
        ...info,
        items: plannedMeals.map(({ recipe, estimatedCost, mealSlot, day, servings }) => ({
          recipeId: recipe.id,
          recipe,
          estimatedCost,
          mealSlot,
          day,
          servings,
        })),
      },
      name,
    });
    setPlannedMeals((current) => current.map((meal, index) => ({ ...meal, planItemId: plan.items[index]?.id })));
    setSavedPlanId(plan.id);
    closeSheet();
    if (then) {
      showToast("Plan saved", "success");
      then();
      return;
    }
    showToast("Plan saved", "success", {
      label: "View",
      // Back from the plan goes to Saved meal plans, as in the prototype.
      onPress: () => {
        router.push("/meal-plans");
        router.push({ pathname: "/meal-plans/[id]", params: { id: plan.id } });
      },
    });
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
          style={StyleSheet.absoluteFill}
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

      <AppText style={styles.inputLabel}>Total budget</AppText>

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
          style={StyleSheet.absoluteFill}
        />
        <AppText style={styles.generateButtonText}>
          Create meal plan
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
          <BudgetPlanSkeleton />
        </View>
      ) : null}

      {budgetPlannerMutation.isError ? (
        <EmptyState
          iconName="offline"
          title="Could not generate plan"
          message={getApiErrorMessage(budgetPlannerMutation.error)}
        />
      ) : isPlanResultPreparing ? null : budgetPlannerMutation.data && shownMeals.length === 0 ? (
        <EmptyState
          iconName="plan"
          title="No meals found"
          message="Try another budget or setup."
        />
      ) : shownMeals.length > 0 ? (
        <PlanMeals
          meals={shownMeals.map((meal) => ({
            key: mealKey(meal),
            recipe: apiRecipeToLocalRecipe(meal.recipe),
            estimatedCost: meal.estimatedCost,
            mealSlot: meal.mealSlot,
            day: meal.day,
          }))}
          onOpenRecipe={(recipeId) => openRecipe(recipeId, "meal_plan")}
          onSwap={handleMealSwap}
          onAddToList={() =>
            void addPlanToList(
              shownMeals.map((meal) => ({ recipeId: meal.recipe.id, servings: meal.servings, day: meal.day })),
              savedPlan?.name
            )
          }
          addToListBusy={isAdding}
          save={{ saved: Boolean(savedPlan), onSave: () => openSavePlanSheet() }}
        />
      ) : null}
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
    fontFamily: theme.fontFamily.body,
    fontSize: 12,
    letterSpacing: 0.36,
    color: "#9FB0A3",
    marginTop: 3,
  },
  inputLabel: {
    fontFamily: theme.fontFamily.bodySemiBold,
    fontSize: 14,
    color: theme.colors.textMuted,
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
});
