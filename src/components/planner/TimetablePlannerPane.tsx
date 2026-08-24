// src/components/planner/TimetablePlannerPane.tsx

import { router } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { LinearGradient } from "expo-linear-gradient";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { useMealPlanMutation } from "../../hooks/api/usePlanner";
import { apiRecipeToLocalRecipe } from "../../lib/api/adapters";
import { getApiErrorMessage } from "../../lib/api/errors";
import { theme } from "../../theme/theme";
import { PlannerMeal } from "../../types/api";
import { RecipePhoto } from "../recipe/RecipePhoto";
import { AppText } from "../ui/AppText";
import { EmptyState } from "../ui/EmptyState";
import { Icon } from "../ui/Icon";
import { ProgressLoader } from "../ui/ProgressLoader";

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
          iconName="offline"
          title="Could not generate meal plan"
          message={getApiErrorMessage(mealPlanMutation.error)}
        />
      ) : mealPlanMutation.isPending ? (
        <ProgressLoader />
      ) : groupedMeals.length === 0 ? (
        <EmptyState
          iconName="plan"
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
                      styles.mealRow,
                      pressed && styles.pressed,
                    ]}
                  >
                    <RecipePhoto
                      imageUrl={recipe.imageUrl}
                      style={styles.mealThumb}
                    />

                    <View style={styles.mealInfo}>
                      <AppText style={styles.mealSlotLabel}>
                        {formatMealSlot(meal.mealSlot)}
                      </AppText>
                      <AppText style={styles.mealName} numberOfLines={1}>
                        {recipe.name}
                      </AppText>
                      <AppText style={styles.mealMeta}>
                        {recipe.time}
                        {recipe.calories !== null
                          ? ` · ${recipe.calories} kcal`
                          : ""}
                      </AppText>
                    </View>

                    <Icon
                      name="chevronRight"
                      size={16}
                      color={theme.colors.textDim}
                    />
                  </Pressable>
                );
              })}
            </View>
          ) : null}
        </View>
      )}

      <View style={styles.buttonWrap}>
        <Pressable
          onPress={generateMealPlan}
          disabled={mealPlanMutation.isPending}
          style={({ pressed }) => [
            styles.generateButton,
            pressed && styles.pressed,
            mealPlanMutation.isPending && styles.disabledButton,
          ]}
        >
          <LinearGradient
            colors={["#1D3327", "#0F1B12"]}
            style={StyleSheet.absoluteFillObject}
          />
          {!mealPlanMutation.isPending && groupedMeals.length > 0 ? (
            <Icon name="swap" size={15} color={theme.colors.onDark} />
          ) : null}
          <AppText style={styles.generateButtonText}>
            {groupedMeals.length > 0
                ? "Regenerate Weekly Plan"
                : "Generate Weekly Plan"}
          </AppText>
        </Pressable>
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
    gap: 8,
    paddingBottom: theme.spacing.sm,
  },
  dayTab: {
    minWidth: 72,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.card,
    paddingHorizontal: 16,
    paddingVertical: 11,
    alignItems: "center",
  },
  dayTabActive: {
    borderColor: theme.colors.navy,
    backgroundColor: theme.colors.navy,
  },
  dayTabLabel: {
    fontFamily: theme.fontFamily.monoBold,
    fontSize: 13,
    letterSpacing: 0.4,
    textTransform: "uppercase",
    color: theme.colors.textMedium,
  },
  dayTabLabelActive: {
    color: "#C7CCC0",
  },
  dayMeals: {
    gap: theme.spacing.sm,
  },
  mealRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  pressed: {
    opacity: 0.9,
  },
  disabledButton: {
    opacity: 0.5,
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
  buttonWrap: {
    paddingHorizontal: 20,
    marginTop: theme.spacing.sm,
  },
  generateButton: {
    height: 58,
    borderRadius: 999,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    overflow: "hidden",
  },
  generateButtonText: {
    fontFamily: theme.fontFamily.bodyBold,
    fontSize: 15.5,
    color: theme.colors.onDark,
  },
});
