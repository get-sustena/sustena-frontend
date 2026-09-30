
import { type SQLiteDatabase } from "expo-sqlite";
import { ProfileAnswers } from "../types/profileAnswers";

const PROFILE_ANSWERS_ID = "current_user_profile_answers";

type LocalProfileAnswersRow = {
  id: string;
  nickname: string | null;
  gender: string | null;
  birthday_month: number | null;
  birthday_day: number | null;
  lifestyle: string | null;
  remote_flex: string | null;
  experience: string | null;
  goals_json: string;
  challenges_json: string;
  habit_who: string | null;
  habit_freq: string | null;
  habit_time: string | null;
  heard: string | null;
  heard_other: string | null;
  updated_at: string;
};

export async function getStoredProfileAnswers(db: SQLiteDatabase) {
  return db.getFirstAsync<LocalProfileAnswersRow>(
    `
    SELECT *
    FROM local_profile_answers
    WHERE id = ?
    LIMIT 1
    `,
    [PROFILE_ANSWERS_ID]
  );
}

export async function saveStoredProfileAnswers(
  db: SQLiteDatabase,
  answers: ProfileAnswers
) {
  const now = new Date().toISOString();

  await db.runAsync(
    `
    INSERT INTO local_profile_answers (
      id,
      nickname,
      gender,
      birthday_month,
      birthday_day,
      lifestyle,
      remote_flex,
      experience,
      goals_json,
      challenges_json,
      habit_who,
      habit_freq,
      habit_time,
      heard,
      heard_other,
      updated_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      nickname = excluded.nickname,
      gender = excluded.gender,
      birthday_month = excluded.birthday_month,
      birthday_day = excluded.birthday_day,
      lifestyle = excluded.lifestyle,
      remote_flex = excluded.remote_flex,
      experience = excluded.experience,
      goals_json = excluded.goals_json,
      challenges_json = excluded.challenges_json,
      habit_who = excluded.habit_who,
      habit_freq = excluded.habit_freq,
      habit_time = excluded.habit_time,
      heard = excluded.heard,
      heard_other = excluded.heard_other,
      updated_at = excluded.updated_at
    `,
    [
      PROFILE_ANSWERS_ID,
      answers.nickname,
      answers.gender,
      answers.birthdayMonth,
      answers.birthdayDay,
      answers.lifestyle,
      answers.remoteFlex,
      answers.experience,
      JSON.stringify(answers.goals),
      JSON.stringify(answers.challenges),
      answers.habitWho,
      answers.habitFreq,
      answers.habitTime,
      answers.heard,
      answers.heardOther,
      now,
    ]
  );
}

export function mapStoredProfileAnswersRow(
  row: LocalProfileAnswersRow | null
): ProfileAnswers | null {
  if (!row) {
    return null;
  }

  return {
    nickname: row.nickname,
    gender: row.gender,
    birthdayMonth: row.birthday_month,
    birthdayDay: row.birthday_day,
    lifestyle: row.lifestyle,
    remoteFlex: row.remote_flex,
    experience: row.experience,
    goals: JSON.parse(row.goals_json) as string[],
    challenges: JSON.parse(row.challenges_json) as string[],
    habitWho: row.habit_who,
    habitFreq: row.habit_freq,
    habitTime: row.habit_time,
    heard: row.heard,
    heardOther: row.heard_other,
  };
}
