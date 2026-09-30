
import { ReactNode } from "react";
import { create } from "zustand";

type ToastTone = "default" | "success" | "danger";

type UIState = {
  sheetContent: ReactNode | null;
  sheetOnClose?: () => void;
  toastMessage: string | null;
  toastTone: ToastTone;
  toastActionLabel: string | null;
  toastAction: (() => void) | null;

  openSheet: (content: ReactNode, opts?: { onClose?: () => void }) => void;
  closeSheet: () => void;
  showToast: (
    message: string,
    tone?: ToastTone,
    action?: { label: string; onPress: () => void }
  ) => void;
  hideToast: () => void;
};

export const useUIStore = create<UIState>((set) => ({
  sheetContent: null,
  sheetOnClose: undefined,
  toastMessage: null,
  toastTone: "default",
  toastActionLabel: null,
  toastAction: null,

  openSheet: (content, opts) => {
    set({ sheetContent: content, sheetOnClose: opts?.onClose });
  },

  closeSheet: () => {
    set((state) => {
      state.sheetOnClose?.();
      return { sheetContent: null, sheetOnClose: undefined };
    });
  },

  showToast: (message, tone = "default", action) => {
    set({
      toastMessage: message,
      toastTone: tone,
      toastActionLabel: action?.label ?? null,
      toastAction: action?.onPress ?? null,
    });
  },

  hideToast: () => {
    set({ toastMessage: null, toastActionLabel: null, toastAction: null });
  },
}));

export const openSheet = (
  content: ReactNode,
  opts?: { onClose?: () => void }
) => useUIStore.getState().openSheet(content, opts);

export const closeSheet = () => useUIStore.getState().closeSheet();

export const showToast = (
  message: string,
  tone?: ToastTone,
  action?: { label: string; onPress: () => void }
) => useUIStore.getState().showToast(message, tone, action);

export const hideToast = () => useUIStore.getState().hideToast();
