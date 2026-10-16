import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import type { LayoutChangeEvent } from "react-native";
import { clearToastLift, setToastLift } from "../store/uiStore";

// Toasts sit 12px above the bar pinned to the bottom of the screen (PRD v6.9,
// "Toasts"). Pass the bar's gap from the bottom edge, and give the bar the
// returned onLayout; the lift holds while the screen is in front.
export function useToastLift(gapFromBottom = 0) {
  const [owner] = useState(() => Symbol("toast-lift"));
  const [barHeight, setBarHeight] = useState(0);

  useFocusEffect(
    useCallback(() => {
      if (!barHeight) return;
      setToastLift(owner, gapFromBottom + barHeight + 12);
      return () => clearToastLift(owner);
    }, [barHeight, gapFromBottom, owner])
  );

  return (event: LayoutChangeEvent) => setBarHeight(event.nativeEvent.layout.height);
}
