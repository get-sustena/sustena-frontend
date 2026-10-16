import { router } from "expo-router";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ProfileQuestionSheet } from "../src/components/profile/complete/ProfileQuestionSheet";
import {
  EXPERIENCE_OPTIONS,
  GENDER_OPTIONS,
  HABIT_FREQ_OPTIONS,
  HABIT_TIME_OPTIONS,
  HABIT_WHO_OPTIONS,
  HEARD_OPTIONS,
  LIFESTYLE_OPTIONS,
  PROFILE_QUESTION_META,
  labelFor,
  type ProfileQuestionField,
} from "../src/components/profile/complete/profileQuestionOptions";
import { AppText } from "../src/components/ui/AppText";
import { Icon } from "../src/components/ui/Icon";
import { SettingsRow } from "../src/components/profile/SettingsRow";
import { SettingsCard, SettingsSection } from "../src/components/settings/SettingsLayout";
import { useSettingsCommands } from "../src/hooks/useSettingsCommands";
import {
  PROFILE_COMPLETION_FIELD_COUNT,
  countAnsweredProfileFields,
} from "../src/lib/profileCompletion";
import { SERVINGS_BY_HABIT_WHO } from "../src/lib/plannerQuickSetup";
import { usePreferencesStore } from "../src/store/preferencesStore";
import { useProfileAnswersStore } from "../src/store/profileAnswersStore";
import { closeSheet, openSheet, showToast } from "../src/store/uiStore";
import { theme } from "../src/theme/theme";
import { ProfileAnswers } from "../src/types/profileAnswers";

export default function ProfileCompleteScreen() {
  const answers = useProfileAnswersStore((state) => state);
  const settings = useSettingsCommands();

  const insets = useSafeAreaInsets();
  const answeredCount = countAnsweredProfileFields(answers);

  async function saveAnswers(partial: Partial<ProfileAnswers>) {
    const next: ProfileAnswers = { ...answers, ...partial };

    closeSheet();
    showToast(getProfileSaveToast(partial, next), "success");
    await settings.saveProfileAnswers(partial);

    // "Who you cook for" sets the default serving size, as the planner's quick setup does.
    const defaultServingSize = partial.habitWho ? SERVINGS_BY_HABIT_WHO[partial.habitWho] : undefined;
    if (defaultServingSize) {
      const preferences = usePreferencesStore.getState();
      await settings.savePreferences({
        healthConditions: preferences.healthConditions,
        dietaryPreference: preferences.dietaryPreference,
        defaultUnitMode: preferences.defaultUnitMode,
        defaultServingSize,
      });
    }
  }

  function openQuestion(field: ProfileQuestionField) {
    openSheet(
      <ProfileQuestionSheet
        field={field}
        answers={answers}
        onSave={saveAnswers}
      />
    );
  }

  const birthdayLabel =
    answers.birthdayMonth && answers.birthdayDay
      ? `${new Date(2000, answers.birthdayMonth - 1).toLocaleString("en", { month: "long" })} ${answers.birthdayDay}`
      : undefined;

  return (
    <View style={styles.screen}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Pressable accessibilityLabel="Back" onPress={() => router.back()} style={styles.backButton}>
          <Icon name="chevronLeft" size={19} />
        </Pressable>
        <AppText style={styles.headerTitle}>Complete profile</AppText>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 120 }]} showsVerticalScrollIndicator={false}>
        <View style={styles.top}>
          <View style={styles.count}>
            <AppText style={styles.countNumber}>{answeredCount}</AppText>
            <AppText style={styles.countLabel}>of {PROFILE_COMPLETION_FIELD_COUNT} answered</AppText>
          </View>
          <AppText style={styles.intro}>Answer anytime. The more we know, the better your suggestions.</AppText>
        </View>

        <SettingsSection title="About you">
          <SettingsCard>
            <QuestionRow field="nickname" value={answers.nickname ?? undefined} onPress={openQuestion} />
            <QuestionRow field="gender" value={labelFor(GENDER_OPTIONS, answers.gender)} onPress={openQuestion} />
            <QuestionRow field="birthday" value={birthdayLabel} onPress={openQuestion} last />
          </SettingsCard>
        </SettingsSection>

        <SettingsSection title="Your cooking life">
          <SettingsCard>
            <QuestionRow field="lifestyle" value={labelFor(LIFESTYLE_OPTIONS, answers.lifestyle)} onPress={openQuestion} />
            <QuestionRow field="experience" value={labelFor(EXPERIENCE_OPTIONS, answers.experience)} onPress={openQuestion} />
            <QuestionRow field="habitFreq" value={labelFor(HABIT_FREQ_OPTIONS, answers.habitFreq)} onPress={openQuestion} />
            <QuestionRow field="habitWho" value={labelFor(HABIT_WHO_OPTIONS, answers.habitWho)} onPress={openQuestion} />
            <QuestionRow field="habitTime" value={labelFor(HABIT_TIME_OPTIONS, answers.habitTime)} onPress={openQuestion} last />
          </SettingsCard>
        </SettingsSection>

        <SettingsSection title="What you're here for">
          <SettingsCard>
            <QuestionRow
              field="goals"
              value={answers.goals.length > 0 ? `${answers.goals.length} ${answers.goals.length === 1 ? "goal" : "goals"}` : undefined}
              onPress={openQuestion}
            />
            <QuestionRow
              field="challenges"
              value={answers.challenges.length > 0 ? `${answers.challenges.length} selected` : undefined}
              onPress={openQuestion}
              last
            />
          </SettingsCard>
        </SettingsSection>

        <SettingsSection title="One last thing">
          <SettingsCard>
            <QuestionRow
              field="heard"
              value={answers.heard === "other" && answers.heardOther ? answers.heardOther : labelFor(HEARD_OPTIONS, answers.heard)}
              onPress={openQuestion}
              last
            />
          </SettingsCard>
        </SettingsSection>
      </ScrollView>
    </View>
  );
}

// v6.9.2's Complete profile row: the answer in brand green, or "Add".
function QuestionRow({
  field,
  value,
  onPress,
  last = false,
}: {
  field: ProfileQuestionField;
  value?: string;
  onPress: (field: ProfileQuestionField) => void;
  last?: boolean;
}) {
  return (
    <SettingsRow
      icon={PROFILE_QUESTION_META[field].icon}
      label={PROFILE_QUESTION_META[field].row}
      onPress={() => onPress(field)}
      showDivider={!last}
      rightElement={
        value ? (
          <AppText style={styles.value} numberOfLines={1}>{value}</AppText>
        ) : (
          <View style={styles.add}>
            <AppText style={styles.addText}>Add</AppText>
            <Icon name="chevronRight" size={15} color={theme.colors.textMedium} />
          </View>
        )
      }
    />
  );
}

function getProfileSaveToast(
  partial: Partial<ProfileAnswers>,
  next: ProfileAnswers
) {
  if ("experience" in partial) {
    return "We'll match recipes to your comfort level";
  }

  if ("habitWho" in partial) {
    return "Default serving size updated";
  }

  if ("birthdayMonth" in partial || "birthdayDay" in partial) {
    return "Date of birth updated";
  }

  if ("nickname" in partial) {
    return next.nickname ? `Hi, ${next.nickname}!` : "Saved";
  }

  return "Saved";
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.colors.page },
  header: { paddingHorizontal: 20, paddingBottom: 16, flexDirection: "row", alignItems: "center", gap: 8 },
  backButton: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  headerTitle: { flex: 1, paddingHorizontal: 10, textAlign: "center", fontFamily: theme.fontFamily.display, fontSize: 18, letterSpacing: -0.18, color: theme.colors.navy },
  headerSpacer: { width: 44, height: 44 },
  scroll: { flex: 1 },
  content: { paddingTop: 6, paddingHorizontal: 16 },
  // v6.9.2's .cp2-top: the answered count on ink, the intro beside it.
  top: { flexDirection: "row", borderRadius: 20, borderWidth: 0.75, borderColor: theme.colors.border, backgroundColor: theme.colors.surface, overflow: "hidden" },
  count: { flex: 1, minHeight: 104, padding: 16, gap: 6, justifyContent: "flex-end", backgroundColor: theme.colors.navy },
  countNumber: { fontFamily: theme.fontFamily.display, fontSize: 40, lineHeight: 40, letterSpacing: 40 * -0.03, color: theme.colors.orange, fontVariant: ["tabular-nums"] },
  countLabel: { fontFamily: theme.fontFamily.bodySemiBold, fontSize: 12, lineHeight: 12 * 1.25, color: theme.colors.onDark, opacity: 0.8 },
  intro: { flex: 1.5, alignSelf: "center", padding: 16, fontFamily: theme.fontFamily.body, fontSize: 13.5, lineHeight: 13.5 * 1.45, color: theme.colors.text },
  value: { flexShrink: 0, maxWidth: 140, fontFamily: theme.fontFamily.bodySemiBold, fontSize: 13.5, lineHeight: 13.5 * 1.2, color: theme.colors.navy3 },
  add: { flexShrink: 0, flexDirection: "row", alignItems: "center", gap: 2 },
  addText: { fontFamily: theme.fontFamily.bodySemiBold, fontSize: 13.5, lineHeight: 13.5, color: theme.colors.textMedium },
});
