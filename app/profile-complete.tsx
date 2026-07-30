// app/profile-complete.tsx
//
// "Complete Profile" gated-question personalization flow. Answers are
// cached locally (local_profile_answers / profileAnswersStore, persisted
// reactively via usePersistProfileAnswers) and synced to the account via
// PUT /me/profile-answers, local-first: the UI updates immediately, the API
// call is best-effort, and a failure is queued for retry.

import { router } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { useState } from "react";
import { Pressable, StyleSheet, TextInput, View } from "react-native";
import { AppText } from "../src/components/ui/AppText";
import { Icon, IconName } from "../src/components/ui/Icon";
import { Screen } from "../src/components/ui/Screen";
import { enqueueSyncOperation } from "../src/db/syncQueueRepository";
import { useUpdateProfileAnswersMutation } from "../src/hooks/api/useProfileAnswers";
import {
  PROFILE_COMPLETION_FIELD_COUNT,
  countAnsweredProfileFields,
} from "../src/lib/profileCompletion";
import { useProfileAnswersStore } from "../src/store/profileAnswersStore";
import { closeSheet, openSheet, showToast } from "../src/store/uiStore";
import { theme } from "../src/theme/theme";
import { ProfileAnswers } from "../src/types/profileAnswers";

const GENDER_OPTIONS = [
  { value: "female", label: "Female" },
  { value: "male", label: "Male" },
  { value: "other", label: "Other" },
  { value: "prefer_not_to_say", label: "Prefer not to say" },
];

const LIFESTYLE_OPTIONS = [
  { value: "student", label: "Student" },
  { value: "working_professional", label: "Working Professional" },
  { value: "stay_at_home", label: "Stay-at-home" },
  { value: "retired", label: "Retired" },
  { value: "other", label: "Other" },
];

const REMOTE_FLEX_OPTIONS = [
  { value: "remote", label: "Remote" },
  { value: "hybrid", label: "Hybrid" },
  { value: "on_site", label: "On-site" },
];

const EXPERIENCE_OPTIONS = [
  { value: "beginner", label: "Beginner" },
  { value: "intermediate", label: "Intermediate" },
  { value: "advanced", label: "Advanced" },
];

const GOAL_OPTIONS = [
  { value: "eat_healthier", label: "Eat healthier" },
  { value: "save_money", label: "Save money" },
  { value: "save_time", label: "Save time" },
  { value: "learn_cuisines", label: "Learn new cuisines" },
  { value: "reduce_waste", label: "Reduce food waste" },
  { value: "meal_prep", label: "Meal prep better" },
];

const CHALLENGE_OPTIONS = [
  { value: "time", label: "Time constraints" },
  { value: "budget", label: "Budget" },
  { value: "skills", label: "Cooking skills" },
  { value: "motivation", label: "Motivation" },
  { value: "picky_eaters", label: "Picky eaters" },
  { value: "equipment", label: "Kitchen equipment" },
];

const HABIT_WHO_OPTIONS = [
  { value: "just_me", label: "Just me" },
  { value: "partner", label: "Me & partner" },
  { value: "family", label: "My family" },
  { value: "roommates", label: "Roommates" },
];

const HABIT_FREQ_OPTIONS = [
  { value: "daily", label: "Daily" },
  { value: "few_times_week", label: "Few times a week" },
  { value: "weekly", label: "Weekly" },
  { value: "rarely", label: "Rarely" },
];

const HABIT_TIME_OPTIONS = [
  { value: "morning", label: "Morning" },
  { value: "afternoon", label: "Afternoon" },
  { value: "evening", label: "Evening" },
  { value: "late_night", label: "Late night" },
];

const HEARD_OPTIONS = [
  { value: "social_media", label: "Social media" },
  { value: "friend_family", label: "Friend or family" },
  { value: "app_store", label: "App store" },
  { value: "search", label: "Search" },
  { value: "other", label: "Other" },
];

function labelFor(options: { value: string; label: string }[], value: string | null) {
  return options.find((option) => option.value === value)?.label;
}

export default function ProfileCompleteScreen() {
  const db = useSQLiteContext();
  const answers = useProfileAnswersStore((state) => state);
  const setProfileAnswers = useProfileAnswersStore(
    (state) => state.setProfileAnswers
  );
  const updateProfileAnswersMutation = useUpdateProfileAnswersMutation();

  const answeredCount = countAnsweredProfileFields(answers);
  const completionPercent = Math.round(
    (answeredCount / PROFILE_COMPLETION_FIELD_COUNT) * 100
  );

  async function saveAnswers(partial: Partial<ProfileAnswers>) {
    const next: ProfileAnswers = { ...answers, ...partial };

    // Local-first: the store updates (and reactively persists to SQLite)
    // immediately, regardless of network availability. The server sync
    // below is best-effort and never blocks or reverts the local change.
    setProfileAnswers(partial);
    closeSheet();
    showToast(getProfileSaveToast(partial, next), "success");

    try {
      await updateProfileAnswersMutation.mutateAsync(next);
    } catch (error) {
      console.error("Failed to sync profile answers, queuing for retry", error);
      await enqueueSyncOperation(db, "profile_answers_update", next).catch(
        (queueError) => {
          console.error("Failed to queue profile answers sync", queueError);
        }
      );
    }
  }

  function openTextSheet(opts: {
    title: string;
    placeholder: string;
    field: "nickname";
  }) {
    openSheet(
      <TextAnswerSheet
        title={opts.title}
        placeholder={opts.placeholder}
        initialValue={answers[opts.field] ?? ""}
        onSave={(value) => saveAnswers({ [opts.field]: value || null })}
      />
    );
  }

  function openSingleSelectSheet(opts: {
    title: string;
    options: { value: string; label: string }[];
    field: keyof ProfileAnswers;
  }) {
    openSheet(
      <SingleSelectSheet
        title={opts.title}
        options={opts.options}
        value={answers[opts.field] as string | null}
        onSelect={(value) => saveAnswers({ [opts.field]: value })}
      />
    );
  }

  function openMultiSelectSheet(opts: {
    title: string;
    options: { value: string; label: string }[];
    field: "goals" | "challenges";
  }) {
    openSheet(
      <MultiSelectSheet
        title={opts.title}
        options={opts.options}
        values={answers[opts.field]}
        onDone={(values) => saveAnswers({ [opts.field]: values })}
      />
    );
  }

  function openBirthdaySheet() {
    openSheet(
      <BirthdaySheet
        month={answers.birthdayMonth}
        day={answers.birthdayDay}
        onSave={(month, day) =>
          saveAnswers({ birthdayMonth: month, birthdayDay: day })
        }
      />
    );
  }

  function openHeardSheet() {
    openSheet(
      <SingleSelectSheet
        title="How did you hear about us?"
        options={HEARD_OPTIONS}
        value={answers.heard}
        onSelect={(value) => {
          if (value !== "other") {
            saveAnswers({ heard: value, heardOther: null });
            return;
          }

          openSheet(
            <TextAnswerSheet
              title="Tell us more"
              placeholder="How did you hear about Sustena?"
              initialValue={answers.heardOther ?? ""}
              onSave={(text) => saveAnswers({ heard: value, heardOther: text })}
            />
          );
        }}
      />
    );
  }

  function openLifestyleSheet() {
    openSheet(
      <SingleSelectSheet
        title="What's your lifestyle?"
        options={LIFESTYLE_OPTIONS}
        value={answers.lifestyle}
        onSelect={(value) => {
          if (value !== "working_professional") {
            saveAnswers({ lifestyle: value, remoteFlex: null });
            return;
          }

          openSheet(
            <SingleSelectSheet
              title="Do you work remote?"
              options={REMOTE_FLEX_OPTIONS}
              value={answers.remoteFlex}
              onSelect={(remoteFlex) =>
                saveAnswers({ lifestyle: value, remoteFlex })
              }
            />
          );
        }}
      />
    );
  }

  const birthdayLabel =
    answers.birthdayMonth && answers.birthdayDay
      ? `${answers.birthdayMonth}/${answers.birthdayDay}`
      : undefined;

  const habitLabel =
    answers.habitFreq && answers.habitTime
      ? `${labelFor(HABIT_FREQ_OPTIONS, answers.habitFreq)}, ${labelFor(
          HABIT_TIME_OPTIONS,
          answers.habitTime
        )}`
      : undefined;

  return (
    <Screen scroll>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Icon name="chevronLeft" size={19} color={theme.colors.text} />
        </Pressable>

        <AppText style={styles.headerTitle}>Complete Profile</AppText>
        <View style={styles.headerSpacer} />
      </View>

      <View style={styles.progressWrap}>
        <AppText style={styles.progressLabel}>
          Answer anytime — the more we know, the better your suggestions.
        </AppText>

        <View style={styles.progressTrack}>
          <View
            style={[styles.progressFill, { width: `${completionPercent}%` }]}
          />
        </View>
        <AppText style={styles.progressCount}>
          {answeredCount} of {PROFILE_COMPLETION_FIELD_COUNT} answered
        </AppText>
      </View>

      <View style={styles.section}>
        <AppText style={styles.sectionTitle}>About You</AppText>
        <View style={styles.sectionCard}>
          <QuestionRow
            icon="profile"
            label="Nickname"
            value={answers.nickname ?? undefined}
            onPress={() =>
              openTextSheet({
                title: "What should we call you?",
                placeholder: "Your nickname",
                field: "nickname",
              })
            }
          />
          <QuestionRow
            icon="undecided"
            label="Gender"
            value={labelFor(GENDER_OPTIONS, answers.gender)}
            onPress={() =>
              openSingleSelectSheet({
                title: "What's your gender?",
                options: GENDER_OPTIONS,
                field: "gender",
              })
            }
          />
          <QuestionRow
            icon="timer"
            label="Birthday"
            value={birthdayLabel}
            onPress={openBirthdaySheet}
          />
          <QuestionRow
            icon="chefHat"
            label="Lifestyle"
            value={labelFor(LIFESTYLE_OPTIONS, answers.lifestyle)}
            onPress={openLifestyleSheet}
          />
        </View>
      </View>

      <View style={styles.section}>
        <AppText style={styles.sectionTitle}>In the Kitchen</AppText>
        <View style={styles.sectionCard}>
          <QuestionRow
            icon="star"
            label="Cooking Experience"
            value={labelFor(EXPERIENCE_OPTIONS, answers.experience)}
            onPress={() =>
              openSingleSelectSheet({
                title: "How experienced are you in the kitchen?",
                options: EXPERIENCE_OPTIONS,
                field: "experience",
              })
            }
          />
          <QuestionRow
            icon="discover"
            label="Goals"
            value={
              answers.goals.length > 0
                ? `${answers.goals.length} selected`
                : undefined
            }
            onPress={() =>
              openMultiSelectSheet({
                title: "What are your goals?",
                options: GOAL_OPTIONS,
                field: "goals",
              })
            }
          />
          <QuestionRow
            icon="help"
            label="Challenges"
            value={
              answers.challenges.length > 0
                ? `${answers.challenges.length} selected`
                : undefined
            }
            onPress={() =>
              openMultiSelectSheet({
                title: "What gets in your way?",
                options: CHALLENGE_OPTIONS,
                field: "challenges",
              })
            }
          />
        </View>
      </View>

      <View style={styles.section}>
        <AppText style={styles.sectionTitle}>Cooking Habits</AppText>
        <View style={styles.sectionCard}>
          <QuestionRow
            icon="servings"
            label="Who do you cook for?"
            value={labelFor(HABIT_WHO_OPTIONS, answers.habitWho)}
            onPress={() =>
              openSingleSelectSheet({
                title: "Who do you usually cook for?",
                options: HABIT_WHO_OPTIONS,
                field: "habitWho",
              })
            }
          />
          <QuestionRow
            icon="timer"
            label="When & how often"
            value={habitLabel}
            onPress={() =>
              openSingleSelectSheet({
                title: "How often do you cook?",
                options: HABIT_FREQ_OPTIONS,
                field: "habitFreq",
              })
            }
          />
          {answers.habitFreq ? (
            <QuestionRow
              icon="timer"
              label="Preferred time"
              value={labelFor(HABIT_TIME_OPTIONS, answers.habitTime)}
              onPress={() =>
                openSingleSelectSheet({
                  title: "When do you usually cook?",
                  options: HABIT_TIME_OPTIONS,
                  field: "habitTime",
                })
              }
            />
          ) : null}
        </View>
      </View>

      <View style={styles.section}>
        <AppText style={styles.sectionTitle}>One Last Thing</AppText>
        <View style={styles.sectionCard}>
          <QuestionRow
            icon="discover"
            label="How did you hear about us?"
            value={
              answers.heard === "other" && answers.heardOther
                ? answers.heardOther
                : labelFor(HEARD_OPTIONS, answers.heard)
            }
            onPress={openHeardSheet}
          />
        </View>
      </View>
    </Screen>
  );
}

function QuestionRow({
  icon,
  label,
  value,
  onPress,
}: {
  icon: IconName;
  label: string;
  value?: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
    >
      <View style={styles.rowIconWrap}>
        <Icon name={icon} size={18} color={theme.colors.navy} />
      </View>

      <View style={styles.rowInfo}>
        <AppText style={styles.rowLabel}>{label}</AppText>
      </View>

      {value ? (
        <AppText style={styles.rowValue} numberOfLines={1}>
          {value}
        </AppText>
      ) : (
        <View style={styles.rowAddWrap}>
          <AppText style={styles.rowAddText}>Add</AppText>
          <Icon name="chevronRight" size={14} color={theme.colors.textMuted} />
        </View>
      )}
    </Pressable>
  );
}

function TextAnswerSheet({
  title,
  placeholder,
  initialValue,
  onSave,
}: {
  title: string;
  placeholder: string;
  initialValue: string;
  onSave: (value: string) => void;
}) {
  const [value, setValue] = useState(initialValue);

  return (
    <View style={styles.sheetContent}>
      <AppText style={styles.sheetTitle}>{title}</AppText>

      <TextInput
        value={value}
        onChangeText={setValue}
        placeholder={placeholder}
        placeholderTextColor={theme.colors.textDim}
        style={styles.sheetInput}
        autoFocus
        returnKeyType="done"
        onSubmitEditing={() => onSave(value)}
      />

      <Pressable
        onPress={() => onSave(value)}
        style={styles.sheetPrimaryButton}
      >
        <AppText style={styles.sheetPrimaryButtonText}>Save</AppText>
      </Pressable>
    </View>
  );
}

function SingleSelectSheet({
  title,
  options,
  value,
  onSelect,
}: {
  title: string;
  options: { value: string; label: string }[];
  value: string | null;
  onSelect: (value: string) => void;
}) {
  return (
    <View style={styles.sheetContent}>
      <AppText style={styles.sheetTitle}>{title}</AppText>

      <View style={styles.chipRow}>
        {options.map((option) => {
          const isSelected = option.value === value;

          return (
            <Pressable
              key={option.value}
              onPress={() => onSelect(option.value)}
              style={[styles.chip, isSelected && styles.chipSelected]}
            >
              <AppText style={styles.chipLabel}>{option.label}</AppText>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function MultiSelectSheet({
  title,
  options,
  values,
  onDone,
}: {
  title: string;
  options: { value: string; label: string }[];
  values: string[];
  onDone: (values: string[]) => void;
}) {
  const [selected, setSelected] = useState<string[]>(values);

  function toggle(value: string) {
    setSelected((current) =>
      current.includes(value)
        ? current.filter((item) => item !== value)
        : [...current, value]
    );
  }

  return (
    <View style={styles.sheetContent}>
      <AppText style={styles.sheetTitle}>{title}</AppText>

      <View style={styles.chipRow}>
        {options.map((option) => {
          const isSelected = selected.includes(option.value);

          return (
            <Pressable
              key={option.value}
              onPress={() => toggle(option.value)}
              style={[styles.chip, isSelected && styles.chipSelected]}
            >
              <AppText style={styles.chipLabel}>{option.label}</AppText>
            </Pressable>
          );
        })}
      </View>

      <Pressable
        onPress={() => onDone(selected)}
        style={styles.sheetPrimaryButton}
      >
        <AppText style={styles.sheetPrimaryButtonText}>Done</AppText>
      </Pressable>
    </View>
  );
}

function BirthdaySheet({
  month,
  day,
  onSave,
}: {
  month: number | null;
  day: number | null;
  onSave: (month: number | null, day: number | null) => void;
}) {
  const [monthText, setMonthText] = useState(month ? String(month) : "");
  const [dayText, setDayText] = useState(day ? String(day) : "");

  function handleSave() {
    const parsedMonth = Number(monthText);
    const parsedDay = Number(dayText);

    const validMonth =
      parsedMonth >= 1 && parsedMonth <= 12 ? parsedMonth : null;
    const validDay = parsedDay >= 1 && parsedDay <= 31 ? parsedDay : null;

    onSave(validMonth, validDay);
  }

  return (
    <View style={styles.sheetContent}>
      <AppText style={styles.sheetTitle}>When&apos;s your birthday?</AppText>

      <View style={styles.birthdayRow}>
        <TextInput
          value={monthText}
          onChangeText={setMonthText}
          placeholder="MM"
          placeholderTextColor={theme.colors.textDim}
          keyboardType="number-pad"
          maxLength={2}
          style={[styles.sheetInput, styles.birthdayInput]}
        />
        <TextInput
          value={dayText}
          onChangeText={setDayText}
          placeholder="DD"
          placeholderTextColor={theme.colors.textDim}
          keyboardType="number-pad"
          maxLength={2}
          style={[styles.sheetInput, styles.birthdayInput]}
        />
      </View>

      <Pressable onPress={handleSave} style={styles.sheetPrimaryButton}>
        <AppText style={styles.sheetPrimaryButtonText}>Save</AppText>
      </Pressable>
    </View>
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
  header: {
    paddingHorizontal: 20,
    paddingTop: 52,
    paddingBottom: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.card,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  headerSpacer: {
    width: 44,
    height: 44,
  },
  headerTitle: {
    flex: 1,
    textAlign: "center",
    fontFamily: theme.fontFamily.display,
    fontSize: 18,
    letterSpacing: -0.2,
    color: theme.colors.text,
  },
  progressWrap: {
    paddingHorizontal: 20,
    marginBottom: theme.spacing.sm,
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
  progressLabel: {
    fontFamily: theme.fontFamily.body,
    fontSize: 14,
    lineHeight: 21,
    color: theme.colors.textMedium,
    marginBottom: 14,
  },
  progressCount: {
    fontFamily: theme.fontFamily.mono,
    fontSize: 12,
    color: theme.colors.textMuted,
    marginTop: 6,
  },
  section: {
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontFamily: theme.fontFamily.monoBold,
    fontSize: 12,
    color: theme.colors.textMuted,
    letterSpacing: 1.2,
    textTransform: "uppercase",
    marginTop: 22,
    marginBottom: 4,
  },
  sectionCard: {
    // Rows carry their own bottom border — no group-level card chrome,
    // matching the mockup's flat row-list pattern.
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  rowPressed: {
    opacity: 0.75,
  },
  rowIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: theme.colors.card2,
    alignItems: "center",
    justifyContent: "center",
  },
  rowInfo: {
    flex: 1,
    minWidth: 0,
  },
  rowLabel: {
    fontFamily: theme.fontFamily.bodySemiBold,
    fontSize: 14.5,
    color: theme.colors.text,
  },
  rowValue: {
    flexShrink: 0,
    maxWidth: 140,
    fontFamily: theme.fontFamily.bodyBold,
    fontSize: 13,
    color: theme.colors.navy3,
    textAlign: "right",
  },
  rowAddWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    flexShrink: 0,
  },
  rowAddText: {
    fontFamily: theme.fontFamily.bodyBold,
    fontSize: 13,
    color: theme.colors.textMuted,
  },
  sheetContent: {
    paddingBottom: theme.spacing.xl,
    gap: theme.spacing.sm,
  },
  sheetTitle: {
    fontFamily: theme.fontFamily.display,
    fontSize: 19,
    color: theme.colors.navy,
    marginBottom: theme.spacing.sm,
  },
  sheetInput: {
    minHeight: 50,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.card2,
    paddingHorizontal: theme.spacing.lg,
    fontFamily: theme.fontFamily.body,
    fontSize: 15,
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
  },
  sheetPrimaryButton: {
    minHeight: 54,
    borderRadius: 999,
    backgroundColor: theme.colors.navy,
    alignItems: "center",
    justifyContent: "center",
    marginTop: theme.spacing.sm,
  },
  sheetPrimaryButtonText: {
    fontFamily: theme.fontFamily.bodyBold,
    fontSize: 15.5,
    color: theme.colors.onDark,
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  chip: {
    paddingHorizontal: 18,
    paddingVertical: 11,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.card,
  },
  chipSelected: {
    borderColor: theme.colors.navy,
    backgroundColor: theme.colors.greenDim,
  },
  chipLabel: {
    fontFamily: theme.fontFamily.bodySemiBold,
    fontSize: 13.5,
    color: theme.colors.text,
  },
  birthdayRow: {
    flexDirection: "row",
    gap: theme.spacing.sm,
  },
  birthdayInput: {
    flex: 1,
  },
});
