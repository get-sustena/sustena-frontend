import { router } from "expo-router";
import { Pressable, StyleSheet, View } from "react-native";
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
import { Icon, IconName } from "../src/components/ui/Icon";
import { Screen } from "../src/components/ui/Screen";
import { useSettingsCommands } from "../src/hooks/useSettingsCommands";
import {
  PROFILE_COMPLETION_FIELD_COUNT,
  countAnsweredProfileFields,
} from "../src/lib/profileCompletion";
import { useProfileAnswersStore } from "../src/store/profileAnswersStore";
import { closeSheet, openSheet, showToast } from "../src/store/uiStore";
import { theme } from "../src/theme/theme";
import { ProfileAnswers } from "../src/types/profileAnswers";

export default function ProfileCompleteScreen() {
  const answers = useProfileAnswersStore((state) => state);
  const settings = useSettingsCommands();

  const answeredCount = countAnsweredProfileFields(answers);
  const completionPercent = Math.round(
    (answeredCount / PROFILE_COMPLETION_FIELD_COUNT) * 100
  );

  async function saveAnswers(partial: Partial<ProfileAnswers>) {
    const next: ProfileAnswers = { ...answers, ...partial };

    closeSheet();
    showToast(getProfileSaveToast(partial, next), "success");
    await settings.saveProfileAnswers(partial);
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
          Answer anytime. The more we know, the better your suggestions.
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
        <AppText style={styles.sectionTitle}>About you</AppText>
        <View style={styles.sectionCard}>
          <QuestionRow
            icon={PROFILE_QUESTION_META.nickname.icon}
            label={PROFILE_QUESTION_META.nickname.row}
            value={answers.nickname ?? undefined}
            onPress={() => openQuestion("nickname")}
          />
          <QuestionRow
            icon={PROFILE_QUESTION_META.gender.icon}
            label={PROFILE_QUESTION_META.gender.row}
            value={labelFor(GENDER_OPTIONS, answers.gender)}
            onPress={() => openQuestion("gender")}
          />
          <QuestionRow
            icon={PROFILE_QUESTION_META.birthday.icon}
            label={PROFILE_QUESTION_META.birthday.row}
            value={birthdayLabel}
            onPress={() => openQuestion("birthday")}
          />
        </View>
      </View>

      <View style={styles.section}>
        <AppText style={styles.sectionTitle}>Your cooking life</AppText>
        <View style={styles.sectionCard}>
          <QuestionRow
            icon={PROFILE_QUESTION_META.lifestyle.icon}
            label={PROFILE_QUESTION_META.lifestyle.row}
            value={labelFor(LIFESTYLE_OPTIONS, answers.lifestyle)}
            onPress={() => openQuestion("lifestyle")}
          />
          <QuestionRow
            icon={PROFILE_QUESTION_META.experience.icon}
            label={PROFILE_QUESTION_META.experience.row}
            value={labelFor(EXPERIENCE_OPTIONS, answers.experience)}
            onPress={() => openQuestion("experience")}
          />
          <QuestionRow
            icon={PROFILE_QUESTION_META.habitFreq.icon}
            label={PROFILE_QUESTION_META.habitFreq.row}
            value={labelFor(HABIT_FREQ_OPTIONS, answers.habitFreq)}
            onPress={() => openQuestion("habitFreq")}
          />
          <QuestionRow
            icon={PROFILE_QUESTION_META.habitWho.icon}
            label={PROFILE_QUESTION_META.habitWho.row}
            value={labelFor(HABIT_WHO_OPTIONS, answers.habitWho)}
            onPress={() => openQuestion("habitWho")}
          />
          <QuestionRow
            icon={PROFILE_QUESTION_META.habitTime.icon}
            label={PROFILE_QUESTION_META.habitTime.row}
            value={labelFor(HABIT_TIME_OPTIONS, answers.habitTime)}
            onPress={() => openQuestion("habitTime")}
          />
        </View>
      </View>

      <View style={styles.section}>
        <AppText style={styles.sectionTitle}>What you&apos;re here for</AppText>
        <View style={styles.sectionCard}>
          <QuestionRow
            icon={PROFILE_QUESTION_META.goals.icon}
            label={PROFILE_QUESTION_META.goals.row}
            value={answers.goals.length > 0 ? `${answers.goals.length} ${answers.goals.length === 1 ? "goal" : "goals"}` : undefined}
            onPress={() => openQuestion("goals")}
          />
          <QuestionRow
            icon={PROFILE_QUESTION_META.challenges.icon}
            label={PROFILE_QUESTION_META.challenges.row}
            value={answers.challenges.length > 0 ? `${answers.challenges.length} selected` : undefined}
            onPress={() => openQuestion("challenges")}
          />
        </View>
      </View>

      <View style={styles.section}>
        <AppText style={styles.sectionTitle}>One last thing</AppText>
        <View style={styles.sectionCard}>
          <QuestionRow
            icon={PROFILE_QUESTION_META.heard.icon}
            label={PROFILE_QUESTION_META.heard.row}
            value={
              answers.heard === "other" && answers.heardOther
                ? answers.heardOther
                : labelFor(HEARD_OPTIONS, answers.heard)
            }
            onPress={() => openQuestion("heard")}
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
    fontFamily: theme.fontFamily.body,
    fontSize: 12,
    color: theme.colors.textMuted,
    marginTop: 6,
  },
  section: {
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontFamily: theme.fontFamily.body,
    fontSize: 14,
    color: theme.colors.textMuted,
    marginTop: 22,
    marginBottom: 4,
  },
  sectionCard: {
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
});
