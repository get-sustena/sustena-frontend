
import { create } from "zustand";
import {
  DEFAULT_PROFILE_ANSWERS,
  ProfileAnswers,
} from "../types/profileAnswers";

type ProfileAnswersState = ProfileAnswers & {
  hydrateProfileAnswers: (answers: ProfileAnswers) => void;
  setProfileAnswers: (answers: Partial<ProfileAnswers>) => void;
  resetProfileAnswers: () => void;
};

export const useProfileAnswersStore = create<ProfileAnswersState>((set) => ({
  ...DEFAULT_PROFILE_ANSWERS,

  hydrateProfileAnswers: (answers) => {
    set({ ...answers });
  },

  setProfileAnswers: (answers) => {
    set((state) => ({ ...state, ...answers }));
  },

  resetProfileAnswers: () => {
    set({ ...DEFAULT_PROFILE_ANSWERS });
  },
}));
