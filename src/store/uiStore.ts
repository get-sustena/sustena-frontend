
import { ReactNode } from "react";
import { create } from "zustand";

type ToastTone = "default" | "success" | "danger" | "offline";

// How far above the bottom of the screen the toast sits, set by the screen
// in front for the bar pinned to its bottom (the tab bar, Add to shopping
// list). null when nothing is pinned there.
type ToastLift = { owner: symbol; value: number } | null;

type UIState = {
  sheetContent: ReactNode | null;
  sheetOnClose?: () => void;
  toastMessage: string | null;
  toastTone: ToastTone;
  toastActionLabel: string | null;
  toastAction: (() => void) | null;
  toastLift: ToastLift;

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
  toastLift: null,

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

export const setToastLift = (owner: symbol, value: number) =>
  useUIStore.setState({ toastLift: { owner, value } });

// Only the screen that set the lift clears it, so a screen leaving can't
// clear the one that just came in front.
export const clearToastLift = (owner: symbol) =>
  useUIStore.setState((state) => (state.toastLift?.owner === owner ? { toastLift: null } : state));
