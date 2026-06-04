// src/components/planner/TimetablePlannerPane.tsx

import { router } from "expo-router";
import { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { Recipe } from "../../data/recipes";
import { theme } from "../../theme/theme";
import { AppText } from "../ui/AppText";
import { Button } from "../ui/Button";

type Day = "Mon" | "Tue" | "Wed" | "Thu" | "Fri" | "Sat" | "Sun";

const DAYS: Day[] = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const MEAL_SLOTS = [
  {
    time: "7:00",
    label: "Breakfast",
  },
  {
    time: "13:00",
    label: "Lunch",
  },
  {
    time: "19:00",
    label: "Dinner",
  },
];

type Props = {
  recipes: Recipe[];
};

export function TimetablePlannerPane({ recipes }: Props) {
  const [activeDay, setActiveDay] = useState<Day>("Mon");
  const [version, setVersion] = useState(0);

  const plan = useMemo(() => {
    return generateSimpleDayPlan({
      recipes,
      day: activeDay,
      version,
    });
  }, [activeDay, recipes, version]);

  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.daysContent}
      >
        {DAYS.map((day) => {
          const isActive = day === activeDay;

          return (
            <Pressable
              key={day}
              onPress={() => setActiveDay(day)}
              style={[styles.dayPill, isActive && styles.activeDayPill]}
            >
              <AppText
                style={[styles.dayText, isActive && styles.activeDayText]}
              >
                {day}
              </AppText>
            </Pressable>
          );
        })}
      </ScrollView>

      <View style={styles.slots}>
        {plan.map((slot) => (
          <Pressable
            key={`${activeDay}-${slot.label}`}
            onPress={() =>
              router.push({
                pathname: "/recipes/[id]",
                params: { id: slot.recipe.id },
              })
            }
            style={({ pressed }) => [
              styles.mealSlot,
              pressed && styles.pressed,
            ]}
          >
            <View style={styles.timeBox}>
              <AppText style={styles.timeLabel}>{slot.label}</AppText>
              <AppText style={styles.timeValue}>{slot.time}</AppText>
            </View>

            <View style={styles.divider} />

            <AppText style={styles.mealEmoji}>{slot.recipe.emoji}</AppText>

            <View style={styles.mealInfo}>
              <AppText style={styles.mealName}>{slot.recipe.name}</AppText>
              <AppText style={styles.mealMeta}>
                {slot.recipe.calories} kcal · {slot.recipe.time}
              </AppText>
            </View>

            <AppText style={styles.chevron}>›</AppText>
          </Pressable>
        ))}
      </View>

      <View style={styles.buttonWrap}>
        <Button
          title="🔄 Regenerate Plan"
          onPress={() => setVersion((current) => current + 1)}
        />
      </View>
    </View>
  );
}

function generateSimpleDayPlan({
  recipes,
  day,
  version,
}: {
  recipes: Recipe[];
  day: Day;
  version: number;
}) {
  const dayIndex = DAYS.indexOf(day);
  const offset = dayIndex + version;

  return MEAL_SLOTS.map((slot, index) => {
    const recipe = recipes[(offset + index) % recipes.length];

    return {
      ...slot,
      recipe,
    };
  });
}

const styles = StyleSheet.create({
  container: {
    paddingBottom: theme.spacing["3xl"],
  },
  daysContent: {
    paddingHorizontal: 20,
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.xl,
  },
  dayPill: {
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.radius.full,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  activeDayPill: {
    backgroundColor: theme.colors.navy,
    borderColor: theme.colors.navy,
  },
  dayText: {
    fontFamily: theme.fontFamily.bodyBold,
    fontSize: 12,
    color: theme.colors.textMuted,
  },
  activeDayText: {
    color: theme.colors.onDark,
  },
  slots: {
    paddingHorizontal: 20,
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
    width: 48,
    alignItems: "center",
  },
  timeLabel: {
    fontFamily: theme.fontFamily.bodyBold,
    fontSize: 8,
    color: theme.colors.textMuted,
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  timeValue: {
    fontFamily: theme.fontFamily.bodyBold,
    fontSize: 13,
    color: theme.colors.orange,
    marginTop: 2,
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
