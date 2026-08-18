import { create } from "zustand";

type CreatorProfileEditDraft = {
  displayName: string;
  handle: string;
  bio: string;
  avatarUrl: string | null;
  specialities: string[];
};

type CreatorProfileEditState = CreatorProfileEditDraft & {
  hydrate: (draft: CreatorProfileEditDraft) => void;
  setSpecialities: (specialities: string[]) => void;
  setPreview: (draft: Omit<CreatorProfileEditDraft, "specialities">) => void;
};

export const useCreatorProfileEditStore = create<CreatorProfileEditState>((set) => ({
  displayName: "",
  handle: "",
  bio: "",
  avatarUrl: null,
  specialities: [],
  hydrate: (draft) => set(draft),
  setSpecialities: (specialities) => set({ specialities }),
  setPreview: (draft) => set(draft),
}));
