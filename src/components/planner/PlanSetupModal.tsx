import { useEffect, useMemo, useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { theme } from "../../theme/theme";
import { AppText } from "../ui/AppText";
import { Icon } from "../ui/Icon";

export type PlanMealSlot = "breakfast" | "lunch" | "dinner";

export type PlanSetupValue = {
  days: number;
  mealsPerDay: number;
  mealSlots: PlanMealSlot[];
};

type PlanStep = "days" | "meals" | "selection" | "summary";

type Props = {
  visible: boolean;
  initialValue: PlanSetupValue;
  intent: "create" | "edit";
  onClose: () => void;
  onComplete: (value: PlanSetupValue) => void;
};

const MEAL_OPTIONS = [
  { value: 1, label: "1 Meal", description: "Just the essentials" },
  { value: 2, label: "2 Meals", description: "A lighter rhythm" },
  {
    value: 3,
    label: "3 Meals",
    description: "Breakfast, lunch & dinner",
  },
] as const;

const SINGLE_MEALS: PlanMealSlot[] = ["breakfast", "lunch", "dinner"];
const MEAL_PAIRS: PlanMealSlot[][] = [
  ["breakfast", "lunch"],
  ["breakfast", "dinner"],
  ["lunch", "dinner"],
];

export function PlanSetupModal({
  visible,
  initialValue,
  intent,
  onClose,
  onComplete,
}: Props) {
  const insets = useSafeAreaInsets();
  const [stepIndex, setStepIndex] = useState(0);
  const [draft, setDraft] = useState(initialValue);
  const steps = useMemo<PlanStep[]>(
    () =>
      draft.mealsPerDay === 3
        ? ["days", "meals", "summary"]
        : ["days", "meals", "selection", "summary"],
    [draft.mealsPerDay]
  );
  const activeStep = steps[Math.min(stepIndex, steps.length - 1)];

  useEffect(() => {
    if (!visible) {
      return;
    }

    setDraft(initialValue);
    setStepIndex(0);
  }, [initialValue, visible]);

  function handleBack() {
    if (stepIndex === 0) {
      onClose();
      return;
    }

    setStepIndex((current) => current - 1);
  }

  function handleNext() {
    if (stepIndex < steps.length - 1) {
      setStepIndex((current) => current + 1);
      return;
    }

    onComplete(draft);
  }

  function selectMealsPerDay(mealsPerDay: number) {
    setDraft((current) => ({
      ...current,
      mealsPerDay,
      mealSlots:
        mealsPerDay === 3
          ? ["breakfast", "lunch", "dinner"]
          : mealsPerDay === 2
            ? current.mealSlots.length === 2
              ? current.mealSlots
              : ["breakfast", "lunch"]
            : current.mealSlots.length === 1
              ? current.mealSlots
              : ["breakfast"],
    }));
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={handleBack}
    >
      <View style={styles.screen}>
        <View
          style={[styles.header, { paddingTop: Math.max(insets.top, 52) }]}
        >
          <View style={styles.headerRow}>
            <Pressable
              onPress={handleBack}
              style={({ pressed }) => [
                styles.backButton,
                pressed && styles.pressed,
              ]}
              accessibilityRole="button"
              accessibilityLabel={stepIndex === 0 ? "Close plan setup" : "Back"}
            >
              <Icon name="chevronLeft" size={19} color={theme.colors.text} />
            </Pressable>

            <AppText style={styles.eyebrow}>Plan Setup</AppText>
            <View style={styles.headerSpacer} />
          </View>

          <View style={styles.progressRow}>
            {steps.map((step, index) => {
              const isReached = index <= stepIndex;

              return (
                <View key={step} style={styles.progressItem}>
                  <View
                    style={[
                      styles.progressBar,
                      isReached && styles.progressBarReached,
                    ]}
                  />
                  <AppText
                    numberOfLines={1}
                    adjustsFontSizeToFit
                    style={[
                      styles.progressLabel,
                      isReached && styles.progressLabelReached,
                      index === stepIndex && styles.progressLabelActive,
                    ]}
                  >
                    {getStepLabel(step)}
                  </AppText>
                </View>
              );
            })}
          </View>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.content}
        >
          <AppText style={styles.title}>
            {getStepTitle(activeStep, draft)}
          </AppText>
          {activeStep !== "summary" ? (
            <AppText style={styles.description}>
              {getStepDescription(activeStep)}
            </AppText>
          ) : null}

          {activeStep === "days" ? (
            <View style={styles.dayGrid}>
              {[1, 2, 3, 4, 5, 6, 7].map((day) => {
                const isSelected = draft.days === day;

                return (
                  <Pressable
                    key={day}
                    onPress={() =>
                      setDraft((current) => ({ ...current, days: day }))
                    }
                    style={({ pressed }) => [
                      styles.dayTile,
                      isSelected && styles.optionSelected,
                      pressed && styles.pressed,
                    ]}
                  >
                    <AppText
                      style={[
                        styles.dayNumber,
                        isSelected && styles.optionTextSelected,
                      ]}
                    >
                      {day}
                    </AppText>
                    <AppText
                      style={[
                        styles.dayLabel,
                        isSelected && styles.optionMutedTextSelected,
                      ]}
                    >
                      {day === 1 ? "day" : "days"}
                    </AppText>
                  </Pressable>
                );
              })}
            </View>
          ) : null}

          {activeStep === "meals"
            ? MEAL_OPTIONS.map((option) => {
                const isSelected = draft.mealsPerDay === option.value;

                return (
                  <PlanOption
                    key={option.value}
                    label={option.label}
                    description={option.description}
                    selected={isSelected}
                    onPress={() => selectMealsPerDay(option.value)}
                  />
                );
              })
            : null}

          {activeStep === "selection" && draft.mealsPerDay === 1
            ? SINGLE_MEALS.map((meal) => (
                <PlanOption
                  key={meal}
                  label={capitalize(meal)}
                  selected={draft.mealSlots[0] === meal}
                  onPress={() =>
                    setDraft((current) => ({
                      ...current,
                      mealSlots: [meal],
                    }))
                  }
                />
              ))
            : null}

          {activeStep === "selection" && draft.mealsPerDay === 2
            ? MEAL_PAIRS.map((pair) => {
                const key = pair.join("+");
                const selected = pair.every((meal) =>
                  draft.mealSlots.includes(meal)
                );

                return (
                  <PlanOption
                    key={key}
                    label={`${capitalize(pair[0])} + ${capitalize(pair[1])}`}
                    selected={selected}
                    onPress={() =>
                      setDraft((current) => ({
                        ...current,
                        mealSlots: pair,
                      }))
                    }
                  />
                );
              })
            : null}

          {activeStep === "summary" ? <PlanSummary value={draft} /> : null}
        </ScrollView>

        <View
          style={[
            styles.footer,
            { paddingBottom: Math.max(insets.bottom, 16) + 14 },
          ]}
        >
          <Pressable
            onPress={handleNext}
            style={({ pressed }) => [
              styles.nextButton,
              pressed && styles.nextButtonPressed,
            ]}
            accessibilityRole="button"
          >
            <AppText style={styles.nextButtonText}>
              {activeStep === "summary"
                ? intent === "create"
                  ? "Create My Meal Plan"
                  : "Save"
                : "Next"}
            </AppText>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

function PlanOption({
  label,
  description,
  selected,
  onPress,
}: {
  label: string;
  description?: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.optionRow,
        selected && styles.optionSelected,
        pressed && styles.pressed,
      ]}
    >
      <View style={styles.optionCopy}>
        <AppText
          style={[
            styles.optionLabel,
            selected && styles.optionTextSelected,
          ]}
        >
          {label}
        </AppText>
        {description ? (
          <AppText
            style={[
              styles.optionDescription,
              selected && styles.optionMutedTextSelected,
            ]}
          >
            {description}
          </AppText>
        ) : null}
      </View>

      {selected ? (
        <Icon name="check" size={20} color={theme.colors.green} />
      ) : null}
    </Pressable>
  );
}

function PlanSummary({ value }: { value: PlanSetupValue }) {
  const totalMeals = value.days * value.mealsPerDay;

  return (
    <View style={styles.summaryCard}>
      <SummaryLine
        label="Days"
        value={`${value.days} ${value.days === 1 ? "day" : "days"}`}
      />
      <SummaryLine
        label="Meals per day"
        value={value.mealSlots.map(capitalize).join(", ")}
      />
      <View style={styles.summaryDivider} />
      <View style={styles.summaryTotalRow}>
        <AppText style={styles.summaryTotalLabel}>Total Meals</AppText>
        <AppText style={styles.summaryTotalValue}>{totalMeals}</AppText>
      </View>
    </View>
  );
}

function SummaryLine({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.summaryLine}>
      <AppText style={styles.summaryLabel}>{label}</AppText>
      <AppText style={styles.summaryValue}>{value}</AppText>
    </View>
  );
}

function getStepLabel(step: PlanStep) {
  if (step === "days") return "Days";
  if (step === "meals") return "Meals";
  if (step === "selection") return "Meal Selection";
  return "Summary";
}

function getStepTitle(step: PlanStep, value: PlanSetupValue) {
  if (step === "days") return "How many days would you like us to plan?";
  if (step === "meals") return "Which meals should we include each day?";
  if (step === "selection") {
    return value.mealsPerDay === 1
      ? "Which meal would you like?"
      : "Which meals should we include each day?";
  }

  return "Your plan, at a glance";
}

function getStepDescription(step: PlanStep) {
  if (step === "days") {
    return "Plan anywhere from a single day to a full week.";
  }

  return "We'll generate these meals for every day in your plan.";
}

function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: theme.colors.white,
  },
  header: {
    paddingHorizontal: 20,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  backButton: {
    width: 42,
    height: 42,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.background,
    alignItems: "center",
    justifyContent: "center",
  },
  eyebrow: {
    fontFamily: theme.fontFamily.monoSemiBold,
    fontSize: 12,
    color: theme.colors.textMuted,
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  headerSpacer: {
    width: 42,
  },
  progressRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 6,
  },
  progressItem: {
    flex: 1,
    minWidth: 0,
    alignItems: "center",
    gap: 6,
  },
  progressBar: {
    width: "100%",
    height: 3,
    borderRadius: 999,
    backgroundColor: theme.colors.border,
  },
  progressBarReached: {
    backgroundColor: theme.colors.green,
  },
  progressLabel: {
    width: "100%",
    fontFamily: theme.fontFamily.monoMedium,
    fontSize: 10,
    color: theme.colors.textMuted,
    textAlign: "center",
    textTransform: "uppercase",
  },
  progressLabelReached: {
    color: theme.colors.text,
  },
  progressLabelActive: {
    fontFamily: theme.fontFamily.monoBold,
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 30,
    paddingBottom: 20,
  },
  title: {
    fontFamily: theme.fontFamily.display,
    fontSize: 24,
    lineHeight: 29,
    color: theme.colors.text,
    marginBottom: 8,
  },
  description: {
    fontFamily: theme.fontFamily.body,
    fontSize: 14,
    lineHeight: 20,
    color: theme.colors.textMedium,
    marginBottom: 26,
  },
  dayGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  dayTile: {
    width: "22%",
    aspectRatio: 1,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.background,
    alignItems: "center",
    justifyContent: "center",
  },
  dayNumber: {
    fontFamily: theme.fontFamily.display,
    fontSize: 19,
    color: theme.colors.text,
  },
  dayLabel: {
    fontFamily: theme.fontFamily.mono,
    fontSize: 11,
    color: theme.colors.textMuted,
    marginTop: 2,
    textTransform: "uppercase",
  },
  optionRow: {
    minHeight: 58,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.background,
    paddingHorizontal: 18,
    paddingVertical: 14,
    marginBottom: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  optionSelected: {
    borderColor: theme.colors.navy,
    backgroundColor: theme.colors.navy,
    shadowColor: theme.colors.navy,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 9,
    elevation: 3,
  },
  optionCopy: {
    flex: 1,
    minWidth: 0,
  },
  optionLabel: {
    fontFamily: theme.fontFamily.bodySemiBold,
    fontSize: 15.5,
    color: theme.colors.text,
  },
  optionDescription: {
    fontFamily: theme.fontFamily.body,
    fontSize: 12.5,
    color: theme.colors.textMedium,
    marginTop: 2,
  },
  optionTextSelected: {
    color: theme.colors.onDark,
  },
  optionMutedTextSelected: {
    color: "#9FB0A3",
  },
  summaryCard: {
    borderRadius: 20,
    backgroundColor: theme.colors.navy,
    padding: 22,
    marginTop: 4,
  },
  summaryLine: {
    minHeight: 30,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  summaryLabel: {
    fontFamily: theme.fontFamily.mono,
    fontSize: 12.5,
    color: "#9FB0A3",
    letterSpacing: 0.6,
    textTransform: "uppercase",
  },
  summaryValue: {
    flex: 1,
    fontFamily: theme.fontFamily.bodySemiBold,
    fontSize: 14,
    color: theme.colors.onDark,
    textAlign: "right",
  },
  summaryDivider: {
    height: 1,
    backgroundColor: "rgba(255,255,255,0.14)",
    marginVertical: 14,
  },
  summaryTotalRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  summaryTotalLabel: {
    fontFamily: theme.fontFamily.bodySemiBold,
    fontSize: 14,
    color: theme.colors.onDark,
  },
  summaryTotalValue: {
    fontFamily: theme.fontFamily.display,
    fontSize: 26,
    color: theme.colors.orange,
  },
  footer: {
    paddingHorizontal: 24,
    paddingTop: 14,
    backgroundColor: theme.colors.white,
  },
  nextButton: {
    height: 54,
    borderRadius: 999,
    backgroundColor: theme.colors.navy,
    alignItems: "center",
    justifyContent: "center",
  },
  nextButtonPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.98 }],
  },
  nextButtonText: {
    fontFamily: theme.fontFamily.bodySemiBold,
    fontSize: 15.5,
    color: theme.colors.onDark,
  },
  pressed: {
    opacity: 0.88,
    transform: [{ scale: 0.98 }],
  },
});
