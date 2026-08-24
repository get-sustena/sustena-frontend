// src/store/uiStore.ts

import { ReactNode } from "react";
import { create } from "zustand";

type ToastTone = "default" | "success" | "danger";

type UIState = {
  sheetContent: ReactNode | null;
  sheetOnClose?: () => void;
  toastMessage: string | null;
  toastTone: ToastTone;

  openSheet: (content: ReactNode, opts?: { onClose?: () => void }) => void;
  closeSheet: () => void;
  showToast: (message: string, tone?: ToastTone) => void;
  hideToast: () => void;
};

export const useUIStore = create<UIState>((set) => ({
  sheetContent: null,
  sheetOnClose: undefined,
  toastMessage: null,
  toastTone: "default",

  openSheet: (content, opts) => {
    set({ sheetContent: content, sheetOnClose: opts?.onClose });
  },

  closeSheet: () => {
    set((state) => {
      state.sheetOnClose?.();
      return { sheetContent: null, sheetOnClose: undefined };
    });
  },

  showToast: (message, tone = "default") => {
    set({ toastMessage: message, toastTone: tone });
  },

  hideToast: () => {
    set({ toastMessage: null });
  },
}));

export const openSheet = (
  content: ReactNode,
  opts?: { onClose?: () => void }
) => useUIStore.getState().openSheet(content, opts);

export const closeSheet = () => useUIStore.getState().closeSheet();

export const showToast = (message: string, tone?: ToastTone) =>
  useUIStore.getState().showToast(message, tone);

export const hideToast = () => useUIStore.getState().hideToast();
