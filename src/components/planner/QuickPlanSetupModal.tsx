import { useState } from "react";
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

export type QuickPlanSetupValue = {
  habitWho: string;
  habitTime: string;
};

type Props = {
  visible: boolean;
  isFirstPlan?: boolean;
  initialValue: QuickPlanSetupValue;
  actionLabel?: string;
  onClose: () => void;
  onComplete: (value: QuickPlanSetupValue) => void;
};

const COOKING_FOR_OPTIONS = [
  { value: "me", label: "Just me" },
  { value: "partner", label: "My partner and me" },
  { value: "family", label: "My family" },
  { value: "friends", label: "Friends, sometimes" },
  { value: "varies", label: "It varies week to week" },
] as const;

const COOK_TIME_OPTIONS = [
  { value: "15", label: "Under 15 min" },
  { value: "15-30", label: "15-30 min" },
  { value: "30-45", label: "30-45 min" },
  { value: "45-60", label: "45-60 min" },
  { value: "60+", label: "Over an hour" },
] as const;

export function QuickPlanSetupModal({
  visible,
  isFirstPlan = true,
  initialValue,
  actionLabel = "Create meal plan",
  onClose,
  onComplete,
}: Props) {
  const insets = useSafeAreaInsets();
  const [draft, setDraft] = useState(initialValue);
  const canContinue = Boolean(draft.habitWho && draft.habitTime);

  function resetDraft() {
    setDraft({
      habitWho: initialValue.habitWho,
      habitTime: initialValue.habitTime,
    });
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      statusBarTranslucent
      onRequestClose={onClose}
      onShow={resetDraft}
    >
      <View style={styles.overlay}>
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="Close quick setup"
        />

        <View
          style={[
            styles.sheet,
            { paddingBottom: Math.max(insets.bottom, 16) + 8 },
          ]}
        >
          <View style={styles.handle} />

          <ScrollView
            showsVerticalScrollIndicator={false}
            bounces={false}
            contentContainerStyle={styles.content}
          >
            <AppText style={styles.eyebrow}>Quick setup</AppText>
            <AppText style={styles.title}>
              {isFirstPlan
                ? "Two quick questions before your first plan"
                : "Update your plan preferences"}
            </AppText>
            <AppText style={styles.description}>
              {isFirstPlan
                ? "So portions and timing come out right."
                : "We'll use these for your next budget plan."}
            </AppText>

            <Question
              title="Who are you cooking for?"
              options={COOKING_FOR_OPTIONS}
              selectedValue={draft.habitWho}
              onSelect={(habitWho) =>
                setDraft((current) => ({ ...current, habitWho }))
              }
            />

            <Question
              title="How much time do you usually have?"
              options={COOK_TIME_OPTIONS}
              selectedValue={draft.habitTime}
              onSelect={(habitTime) =>
                setDraft((current) => ({ ...current, habitTime }))
              }
            />

            <Pressable
              onPress={() => onComplete(draft)}
              disabled={!canContinue}
              style={({ pressed }) => [
                styles.continueButton,
                !canContinue && styles.continueButtonDisabled,
                pressed && canContinue && styles.pressed,
              ]}
              accessibilityRole="button"
            >
              <AppText style={styles.continueButtonText}>{actionLabel}</AppText>
            </Pressable>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

function Question({
  title,
  options,
  selectedValue,
  onSelect,
}: {
  title: string;
  options: readonly { value: string; label: string }[];
  selectedValue: string;
  onSelect: (value: string) => void;
}) {
  return (
    <View style={styles.question}>
      <AppText style={styles.questionTitle}>{title}</AppText>
      <View style={styles.options}>
        {options.map((option) => {
          const isSelected = option.value === selectedValue;

          return (
            <Pressable
              key={option.value}
              onPress={() => onSelect(option.value)}
              style={({ pressed }) => [
                styles.option,
                isSelected && styles.optionSelected,
                pressed && styles.optionPressed,
              ]}
              accessibilityRole="radio"
              accessibilityState={{ checked: isSelected }}
            >
              <AppText style={styles.optionText}>{option.label}</AppText>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    alignItems: "center",
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.45)",
  },
  sheet: {
    width: "100%",
    maxWidth: 480,
    maxHeight: "88%",
    paddingTop: 10,
    paddingHorizontal: 20,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    backgroundColor: theme.colors.card,
  },
  handle: {
    alignSelf: "center",
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: theme.colors.border2,
    marginBottom: 18,
  },
  content: {
    paddingBottom: 4,
  },
  eyebrow: {
    fontFamily: theme.fontFamily.body,
    fontSize: 14,
    color: theme.colors.textMuted,
    marginBottom: 8,
  },
  title: {
    fontFamily: theme.fontFamily.display,
    fontSize: 19,
    lineHeight: 24,
    color: theme.colors.text,
    marginBottom: 6,
  },
  description: {
    fontFamily: theme.fontFamily.body,
    fontSize: 13.5,
    lineHeight: 20,
    color: theme.colors.textMedium,
    marginBottom: 20,
  },
  question: {
    marginBottom: 22,
  },
  questionTitle: {
    fontFamily: theme.fontFamily.bodySemiBold,
    fontSize: 15.5,
    lineHeight: 20,
    color: theme.colors.text,
    marginBottom: 10,
  },
  options: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  option: {
    minHeight: 44,
    justifyContent: "center",
    paddingHorizontal: 18,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.card,
  },
  optionSelected: {
    borderColor: theme.colors.navy,
    backgroundColor: theme.colors.navyDim,
  },
  optionPressed: {
    opacity: 0.78,
  },
  optionText: {
    fontFamily: theme.fontFamily.bodySemiBold,
    fontSize: 13.5,
    color: theme.colors.text,
  },
  continueButton: {
    height: 54,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 999,
    backgroundColor: theme.colors.navy,
  },
  continueButtonDisabled: {
    opacity: 0.4,
  },
  continueButtonText: {
    fontFamily: theme.fontFamily.bodyBold,
    fontSize: 15.5,
    color: theme.colors.onDark,
  },
  pressed: {
    opacity: 0.88,
  },
});
