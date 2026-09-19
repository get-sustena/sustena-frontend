// src/hooks/usePersistProfileAnswers.ts

import { useSQLiteContext } from "expo-sqlite";
import { useEffect } from "react";
import { saveStoredProfileAnswers } from "../db/localProfileAnswersRepository";
import { trackAccountBackgroundTask } from "../lib/accountBackgroundTasks";
import { useProfileAnswersStore } from "../store/profileAnswersStore";

export function usePersistProfileAnswers(enabled = true) {
  const db = useSQLiteContext();

  const nickname = useProfileAnswersStore((state) => state.nickname);
  const gender = useProfileAnswersStore((state) => state.gender);
  const birthdayMonth = useProfileAnswersStore((state) => state.birthdayMonth);
  const birthdayDay = useProfileAnswersStore((state) => state.birthdayDay);
  const lifestyle = useProfileAnswersStore((state) => state.lifestyle);
  const remoteFlex = useProfileAnswersStore((state) => state.remoteFlex);
  const experience = useProfileAnswersStore((state) => state.experience);
  const goals = useProfileAnswersStore((state) => state.goals);
  const challenges = useProfileAnswersStore((state) => state.challenges);
  const habitWho = useProfileAnswersStore((state) => state.habitWho);
  const habitFreq = useProfileAnswersStore((state) => state.habitFreq);
  const habitTime = useProfileAnswersStore((state) => state.habitTime);
  const heard = useProfileAnswersStore((state) => state.heard);
  const heardOther = useProfileAnswersStore((state) => state.heardOther);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    trackAccountBackgroundTask(saveStoredProfileAnswers(db, {
      nickname,
      gender,
      birthdayMonth,
      birthdayDay,
      lifestyle,
      remoteFlex,
      experience,
      goals,
      challenges,
      habitWho,
      habitFreq,
      habitTime,
      heard,
      heardOther,
    })).catch((error) => {
      console.error("Failed to persist profile answers", error);
    });
  }, [
    db,
    enabled,
    nickname,
    gender,
    birthdayMonth,
    birthdayDay,
    lifestyle,
    remoteFlex,
    experience,
    goals,
    challenges,
    habitWho,
    habitFreq,
    habitTime,
    heard,
    heardOther,
  ]);
}
