// src/components/ui/Toast.tsx
// Single global toast host, mounted once at the app root. Anywhere else,
// call showToast(message) from src/store/uiStore to surface it.

import { useEffect } from "react";
import { StyleSheet } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { hideToast, useUIStore } from "../../store/uiStore";
import { theme } from "../../theme/theme";
import { AppText } from "./AppText";

const AUTO_DISMISS_MS = 2600;

const TONE_COLORS: Record<"default" | "success" | "danger", string> = {
  default: theme.colors.primary,
  success: theme.colors.navy,
  danger: theme.colors.red,
};

export function ToastHost() {
  const message = useUIStore((state) => state.toastMessage);
  const tone = useUIStore((state) => state.toastTone);
  const progress = useSharedValue(0);
  const isVisible = message !== null;

  useEffect(() => {
    progress.value = withTiming(isVisible ? 1 : 0, {
      duration: 220,
      easing: Easing.out(Easing.cubic),
    });

    if (!isVisible) {
      return;
    }

    const timer = setTimeout(hideToast, AUTO_DISMISS_MS);
    return () => clearTimeout(timer);
  }, [isVisible, progress, message]);

  const toastStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [{ translateY: (1 - progress.value) * 16 }],
  }));

  if (!message) {
    return null;
  }

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.toast,
        { backgroundColor: TONE_COLORS[tone] },
        toastStyle,
      ]}
    >
      <AppText style={styles.text}>{message}</AppText>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  toast: {
    position: "absolute",
    left: theme.spacing.xl,
    right: theme.spacing.xl,
    bottom: 110,
    borderRadius: theme.radius.md,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    alignItems: "center",
  },
  text: {
    fontFamily: theme.fontFamily.bodyMedium,
    fontSize: theme.fontSize.md,
    color: theme.colors.onDark,
    textAlign: "center",
  },
});
