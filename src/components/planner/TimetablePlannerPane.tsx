// src/components/planner/TimetablePlannerPane.tsx

import { router } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { useMealPlanMutation } from "../../hooks/api/usePlanner";
import { apiRecipeToLocalRecipe } from "../../lib/api/adapters";
import { getApiErrorMessage } from "../../lib/api/errors";
import { theme } from "../../theme/theme";
import { PlannerMeal } from "../../types/api";
import { AppText } from "../ui/AppText";
import { Button } from "../ui/Button";
import { EmptyState } from "../ui/EmptyState";

export function TimetablePlannerPane() {
  const mealPlanMutation = useMealPlanMutation();
  const [selectedDay, setSelectedDay] = useState(1);

  const groupedMeals = useMemo(() => {
    return groupMealsByDay(mealPlanMutation.data?.meals ?? []);
  }, [mealPlanMutation.data?.meals]);

  const selectedGroup =
    groupedMeals.find((group) => group.day === selectedDay) ?? groupedMeals[0];

  useEffect(() => {
    if (
      groupedMeals.length > 0 &&
      !groupedMeals.some((group) => group.day === selectedDay)
    ) {
      setSelectedDay(groupedMeals[0].day);
    }
  }, [groupedMeals, selectedDay]);

  function generateMealPlan() {
    mealPlanMutation.mutate({
      days: 7,
      mealsPerDay: 3,
    });
  }

  return (
    <View style={styles.container}>
      {mealPlanMutation.isError ? (
        <EmptyState
          icon="⚠️"
          title="Could not generate meal plan"
          message={getApiErrorMessage(mealPlanMutation.error)}
        />
      ) : mealPlanMutation.isPending ? (
        <EmptyState
          icon="📅"
          title="Generating plan"
          message="Building a 7-day meal plan from published recipes."
        />
      ) : groupedMeals.length === 0 ? (
        <EmptyState
          icon="📅"
          title="No meal plan yet"
          message="Generate a weekly plan to see 21 meals grouped by day."
        />
      ) : (
        <View style={styles.plan}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.dayTabs}
          >
            {groupedMeals.map((group) => {
              const isActive = selectedGroup?.day === group.day;

              return (
                <Pressable
                  key={group.day}
                  onPress={() => setSelectedDay(group.day)}
                  style={[styles.dayTab, isActive && styles.dayTabActive]}
                >
                  <AppText
                    style={[
                      styles.dayTabLabel,
                      isActive && styles.dayTabLabelActive,
                    ]}
                  >
                    {getWeekdayLabel(group.day)}
                  </AppText>
                  <AppText
                    style={[
                      styles.dayTabSubLabel,
                      isActive && styles.dayTabLabelActive,
                    ]}
                  >
                    Day {group.day}
                  </AppText>
                </Pressable>
              );
            })}
          </ScrollView>

          {selectedGroup ? (
            <View style={styles.dayMeals}>
              {selectedGroup.meals.map((meal) => {
                const recipe = apiRecipeToLocalRecipe(meal.recipe);

                return (
                  <Pressable
                    key={`${meal.day}-${meal.mealSlot}-${recipe.id}`}
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
                    <View style={styles.timeBox}>
                      <AppText style={styles.timeLabel}>
                        {formatMealSlot(meal.mealSlot)}
                      </AppText>
                    </View>

                    <View style={styles.divider} />

                    <AppText style={styles.mealEmoji}>{recipe.emoji}</AppText>

                    <View style={styles.mealInfo}>
                      <AppText style={styles.mealName}>{recipe.name}</AppText>
                      <AppText style={styles.mealMeta}>
                        {recipe.calories !== null
                          ? `${recipe.calories} kcal · `
                          : ""}
                        {recipe.time}
                      </AppText>
                    </View>

                    <AppText style={styles.chevron}>›</AppText>
                  </Pressable>
                );
              })}
            </View>
          ) : null}
        </View>
      )}

      <View style={styles.buttonWrap}>
        <Button
          title={
            mealPlanMutation.isPending
              ? "Generating..."
              : groupedMeals.length > 0
                ? "🔄 Regenerate Weekly Plan"
                : "Generate Weekly Plan"
          }
          disabled={mealPlanMutation.isPending}
          onPress={generateMealPlan}
        />
      </View>
    </View>
  );
}

function groupMealsByDay(meals: PlannerMeal[]) {
  const grouped = meals.reduce<Record<number, PlannerMeal[]>>((acc, meal) => {
    if (!acc[meal.day]) {
      acc[meal.day] = [];
    }

    acc[meal.day].push(meal);
    return acc;
  }, {});

  return Object.entries(grouped)
    .sort(([dayA], [dayB]) => Number(dayA) - Number(dayB))
    .map(([day, mealsForDay]) => ({
      day: Number(day),
      meals: mealsForDay.sort(
        (mealA, mealB) =>
          getMealSlotOrder(mealA.mealSlot) - getMealSlotOrder(mealB.mealSlot)
      ),
    }));
}

function getMealSlotOrder(mealSlot: PlannerMeal["mealSlot"]) {
  if (mealSlot === "breakfast") return 1;
  if (mealSlot === "lunch") return 2;
  if (mealSlot === "dinner") return 3;

  return 4;
}

function formatMealSlot(mealSlot: PlannerMeal["mealSlot"]) {
  return mealSlot.charAt(0).toUpperCase() + mealSlot.slice(1);
}

function getWeekdayLabel(day: number) {
  const weekdays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  return weekdays[(day - 1) % weekdays.length] ?? `Day ${day}`;
}

const styles = StyleSheet.create({
  container: {
    paddingBottom: theme.spacing["3xl"],
  },
  plan: {
    paddingHorizontal: 20,
    gap: theme.spacing.lg,
  },
  dayTabs: {
    gap: theme.spacing.sm,
    paddingBottom: theme.spacing.sm,
  },
  dayTab: {
    minWidth: 72,
    borderRadius: theme.radius.md,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    alignItems: "center",
  },
  dayTabActive: {
    borderColor: theme.colors.navy,
    backgroundColor: theme.colors.navy,
  },
  dayTabLabel: {
    fontFamily: theme.fontFamily.bodyBold,
    fontSize: 13,
    color: theme.colors.navy,
  },
  dayTabSubLabel: {
    fontFamily: theme.fontFamily.bodyBold,
    fontSize: 9,
    color: theme.colors.textMuted,
    textTransform: "uppercase",
    marginTop: 2,
  },
  dayTabLabelActive: {
    color: theme.colors.onDark,
  },
  dayMeals: {
    gap: theme.spacing.sm,
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
    gap: theme.spacing.md,
  },
  pressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
  timeBox: {
    width: 68,
    alignItems: "center",
  },
  timeLabel: {
    fontFamily: theme.fontFamily.bodyBold,
    fontSize: 8,
    color: theme.colors.textMuted,
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  divider: {
    width: 1,
    height: 40,
    backgroundColor: theme.colors.border,
  },
  mealEmoji: {
    fontSize: 28,
  },
  mealInfo: {
    flex: 1,
  },
  mealName: {
    fontFamily: theme.fontFamily.bodyBold,
    fontSize: 14,
    color: theme.colors.navy,
  },
  mealMeta: {
    fontFamily: theme.fontFamily.body,
    fontSize: 11,
    color: theme.colors.textMuted,
    marginTop: 2,
  },
  chevron: {
    fontSize: 22,
    color: theme.colors.textDim,
  },
  buttonWrap: {
    paddingHorizontal: 20,
    marginTop: theme.spacing.sm,
  },
});
