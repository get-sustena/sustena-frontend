
export type ProfileAnswers = {
  nickname: string | null;
  gender: string | null;
  birthdayMonth: number | null;
  birthdayDay: number | null;
  lifestyle: string | null;
  remoteFlex: string | null;
  experience: string | null;
  goals: string[];
  challenges: string[];
  habitWho: string | null;
  habitFreq: string | null;
  habitTime: string | null;
  heard: string | null;
  heardOther: string | null;
};

export const DEFAULT_PROFILE_ANSWERS: ProfileAnswers = {
  nickname: null,
  gender: null,
  birthdayMonth: null,
  birthdayDay: null,
  lifestyle: null,
  remoteFlex: null,
  experience: null,
  goals: [],
  challenges: [],
  habitWho: null,
  habitFreq: null,
  habitTime: null,
  heard: null,
  heardOther: null,
};
