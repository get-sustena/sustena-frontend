// src/lib/profileCompletion.ts

import { ProfileAnswers } from "../types/profileAnswers";

// remoteFlex and heardOther are conditional follow-ups, not counted toward
// the base completion total.
export const PROFILE_COMPLETION_FIELD_COUNT = 11;

export function countAnsweredProfileFields(answers: ProfileAnswers) {
  let count = 0;

  if (answers.nickname) count += 1;
  if (answers.gender) count += 1;
  if (answers.birthdayMonth && answers.birthdayDay) count += 1;
  if (answers.lifestyle) count += 1;
  if (answers.experience) count += 1;
  if (answers.goals.length > 0) count += 1;
  if (answers.challenges.length > 0) count += 1;
  if (answers.habitWho) count += 1;
  if (answers.habitFreq) count += 1;
  if (answers.habitTime) count += 1;
  if (answers.heard) count += 1;

  return count;
}
