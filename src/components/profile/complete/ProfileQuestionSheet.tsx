import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, TextInput, useWindowDimensions, View } from "react-native";
import { theme } from "../../../theme/theme";
import type { ProfileAnswers } from "../../../types/profileAnswers";
import { showToast } from "../../../store/uiStore";
import { AppText } from "../../ui/AppText";
import { ProfileBirthdayWheel } from "./ProfileBirthdayWheel";
import { ProfileChoiceChips } from "./ProfileChoiceChips";
import { ProfileExperienceCards } from "./ProfileExperienceCards";
import { ProfileIconGrid } from "./ProfileIconGrid";
import { ProfileRadioList } from "./ProfileRadioList";
import {
  CHALLENGE_OPTIONS,
  EXPERIENCE_OPTIONS,
  GENDER_OPTIONS,
  GOAL_OPTIONS,
  HABIT_FREQ_OPTIONS,
  HABIT_TIME_OPTIONS,
  HABIT_WHO_OPTIONS,
  HEARD_OPTIONS,
  LIFESTYLE_OPTIONS,
  PROFILE_QUESTION_META,
  REMOTE_FLEX_OPTIONS,
  type ProfileQuestionField,
} from "./profileQuestionOptions";

export function ProfileQuestionSheet({ field, answers, onSave }: { field: ProfileQuestionField; answers: ProfileAnswers; onSave: (partial: Partial<ProfileAnswers>) => void }) {
  const { height } = useWindowDimensions();
  const meta = PROFILE_QUESTION_META[field];
  const desiredHeight = {
    nickname: 220,
    gender: 235,
    birthday: 340,
    lifestyle: 620,
    experience: 475,
    habitFreq: 250,
    habitWho: 250,
    habitTime: 250,
    goals: 590,
    challenges: 590,
    heard: 390,
  }[field];
  const [nickname, setNickname] = useState(answers.nickname ?? "");
  const [gender, setGender] = useState(answers.gender);
  const [birthdayMonth, setBirthdayMonth] = useState(answers.birthdayMonth ?? 6);
  const [birthdayDay, setBirthdayDay] = useState(answers.birthdayDay ?? 15);
  const [lifestyle, setLifestyle] = useState(answers.lifestyle);
  const [remoteFlex, setRemoteFlex] = useState(answers.remoteFlex);
  const [experience, setExperience] = useState(answers.experience);
  const [habitFreq, setHabitFreq] = useState(answers.habitFreq);
  const [habitWho, setHabitWho] = useState(answers.habitWho);
  const [habitTime, setHabitTime] = useState(answers.habitTime);
  const [goals, setGoals] = useState(answers.goals);
  const [challenges, setChallenges] = useState(answers.challenges);
  const [heard, setHeard] = useState(answers.heard);
  const [heardOther, setHeardOther] = useState(answers.heardOther ?? "");

  function toggleGoal(value: string) {
    setGoals((current) => current.includes(value) ? current.filter((item) => item !== value) : [...current, value]);
  }

  function toggleChallenge(value: string) {
    setChallenges((current) => {
      if (current.includes(value)) return current.filter((item) => item !== value);
      if (current.length >= 3) {
        showToast("That's three. Remove one to add another.");
        return current;
      }
      return [...current, value];
    });
  }

  function save() {
    switch (field) {
      case "nickname": onSave({ nickname: nickname.trim() || null }); break;
      case "gender": onSave({ gender }); break;
      case "birthday": onSave({ birthdayMonth, birthdayDay }); break;
      case "lifestyle": onSave({ lifestyle, remoteFlex: lifestyle === "remote" ? remoteFlex : null }); break;
      case "experience": onSave({ experience }); break;
      case "habitFreq": onSave({ habitFreq }); break;
      case "habitWho": onSave({ habitWho }); break;
      case "habitTime": onSave({ habitTime }); break;
      case "goals": onSave({ goals }); break;
      case "challenges": onSave({ challenges }); break;
      case "heard": onSave({ heard, heardOther: heard === "other" ? heardOther.trim() || null : null }); break;
    }
  }

  return <View style={[styles.sheet, { height: Math.min(desiredHeight, height * 0.82) }]}>
    <AppText style={styles.title}>{meta.question}</AppText>
    <AppText style={styles.why}>{meta.why}</AppText>
    <ScrollView style={styles.scroll} contentContainerStyle={styles.options} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
      {field === "nickname" ? <TextInput value={nickname} onChangeText={setNickname} placeholder="e.g. Ada" placeholderTextColor={theme.colors.textDim} style={styles.input} autoFocus returnKeyType="done" onSubmitEditing={save} /> : null}
      {field === "gender" ? <View style={styles.genderRow}>{GENDER_OPTIONS.map((option) => {
        const active = gender === option.value;
        return <Pressable key={option.value} onPress={() => setGender(option.value)} style={({ pressed }) => [styles.genderCard, active && styles.genderCardActive, pressed && styles.pressed]}><AppText style={styles.genderLabel}>{option.label}</AppText></Pressable>;
      })}</View> : null}
      {field === "birthday" ? <ProfileBirthdayWheel month={birthdayMonth} day={birthdayDay} onChange={(month, day) => { setBirthdayMonth(month); setBirthdayDay(day); }} /> : null}
      {field === "lifestyle" ? <View><ProfileRadioList options={LIFESTYLE_OPTIONS} value={lifestyle} onSelect={setLifestyle} />{lifestyle === "remote" ? <View style={styles.remoteWrap}><AppText style={styles.remoteLabel}>How flexible is your schedule?</AppText><View style={styles.segmented}>{REMOTE_FLEX_OPTIONS.map((option) => {
        const active = remoteFlex === option.value;
        return <Pressable key={option.value} onPress={() => setRemoteFlex(option.value)} style={[styles.segment, active && styles.segmentActive]}><AppText style={[styles.segmentLabel, active && styles.segmentLabelActive]}>{option.label}</AppText></Pressable>;
      })}</View></View> : null}</View> : null}
      {field === "experience" ? <ProfileExperienceCards options={EXPERIENCE_OPTIONS} value={experience} onSelect={setExperience} /> : null}
      {field === "habitFreq" ? <ProfileChoiceChips options={HABIT_FREQ_OPTIONS} value={habitFreq} onSelect={setHabitFreq} /> : null}
      {field === "habitWho" ? <ProfileChoiceChips options={HABIT_WHO_OPTIONS} value={habitWho} onSelect={setHabitWho} /> : null}
      {field === "habitTime" ? <ProfileChoiceChips options={HABIT_TIME_OPTIONS} value={habitTime} onSelect={setHabitTime} /> : null}
      {field === "goals" ? <ProfileIconGrid options={GOAL_OPTIONS} selected={goals} onToggle={toggleGoal} /> : null}
      {field === "challenges" ? <ProfileIconGrid options={CHALLENGE_OPTIONS} selected={challenges} onToggle={toggleChallenge} /> : null}
      {field === "heard" ? <View><ProfileChoiceChips options={HEARD_OPTIONS} value={heard} onSelect={setHeard} />{heard === "other" ? <TextInput value={heardOther} onChangeText={setHeardOther} placeholder="Tell us where…" placeholderTextColor={theme.colors.textDim} style={[styles.input, styles.otherInput]} autoFocus /> : null}</View> : null}
    </ScrollView>
    <Pressable onPress={save} style={({ pressed }) => [styles.save, pressed && styles.pressed]}><AppText style={styles.saveText}>Save</AppText></Pressable>
  </View>;
}

const styles = StyleSheet.create({
  sheet: { paddingBottom: 20 },
  title: { fontFamily: theme.fontFamily.display, fontSize: 19, lineHeight: 24, color: theme.colors.text, marginBottom: 6 },
  why: { fontFamily: theme.fontFamily.body, fontSize: 13.5, lineHeight: 20, color: theme.colors.textMedium, marginBottom: 16 },
  scroll: { flex: 1 },
  options: { paddingBottom: 18 },
  input: { width: "100%", minHeight: 50, borderWidth: 1, borderColor: theme.colors.border, borderRadius: 12, backgroundColor: theme.colors.card2, paddingHorizontal: 16, fontFamily: theme.fontFamily.body, fontSize: 15, color: theme.colors.text },
  otherInput: { marginTop: 12 },
  genderRow: { flexDirection: "row", gap: 12 },
  genderCard: { flex: 1, alignItems: "center", paddingVertical: 22, paddingHorizontal: 12, borderRadius: 16, borderWidth: 1.5, borderColor: theme.colors.border, backgroundColor: theme.colors.white },
  genderCardActive: { borderColor: theme.colors.navy, backgroundColor: "rgba(52,182,115,0.08)" },
  genderLabel: { fontFamily: theme.fontFamily.bodyBold, fontSize: 14.5, color: theme.colors.text },
  remoteWrap: { marginTop: 14 },
  remoteLabel: { fontFamily: theme.fontFamily.monoBold, fontSize: 12, letterSpacing: 1.2, textTransform: "uppercase", color: theme.colors.textMuted, marginBottom: 10 },
  segmented: { flexDirection: "row", gap: 4, borderRadius: 14, padding: 4, backgroundColor: theme.colors.card2 },
  segment: { flex: 1, paddingVertical: 11, paddingHorizontal: 8, borderRadius: 10, alignItems: "center" },
  segmentActive: { backgroundColor: theme.colors.white },
  segmentLabel: { fontFamily: theme.fontFamily.bodySemiBold, fontSize: 13.5, color: theme.colors.textMedium },
  segmentLabelActive: { color: theme.colors.text },
  save: { height: 54, borderRadius: 999, backgroundColor: theme.colors.navy, alignItems: "center", justifyContent: "center" },
  saveText: { fontFamily: theme.fontFamily.bodyBold, fontSize: 15.5, color: theme.colors.onDark },
  pressed: { transform: [{ scale: 0.97 }] },
});
