
import { useEffect } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
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
  const insets = useSafeAreaInsets();
  const message = useUIStore((state) => state.toastMessage);
  const tone = useUIStore((state) => state.toastTone);
  const actionLabel = useUIStore((state) => state.toastActionLabel);
  const action = useUIStore((state) => state.toastAction);
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
    transform: [{ translateY: (1 - progress.value) * -16 }],
  }));

  if (!message) {
    return null;
  }

  return (
    <Animated.View
      pointerEvents="box-none"
      style={[
        styles.toast,
        { top: insets.top + 18 },
        { backgroundColor: TONE_COLORS[tone] },
        toastStyle,
      ]}
    >
      <View style={styles.content}>
        <AppText style={styles.text}>{message}</AppText>
        {actionLabel && action ? (
          <Pressable
            onPress={() => {
              hideToast();
              action();
            }}
            accessibilityRole="button"
            accessibilityLabel={actionLabel}
          >
            <AppText style={styles.action}>{actionLabel}</AppText>
          </Pressable>
        ) : null}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  toast: {
    position: "absolute",
    left: 18,
    right: 18,
    zIndex: 300,
    minHeight: 40,
    maxWidth: 520,
    alignSelf: "center",
    borderRadius: 999,
    paddingLeft: 13,
    paddingRight: 16,
    paddingVertical: 9,
    alignItems: "center",
    boxShadow: "0 10px 26px -12px rgba(0,0,0,0.5)",
  },
  text: {
    fontFamily: theme.fontFamily.bodyMedium,
    fontSize: theme.fontSize.md,
    color: theme.colors.onDark,
    textAlign: "left",
    flexShrink: 1,
  },
  content: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7 },
  action: {
    marginLeft: 3,
    paddingLeft: 12,
    borderLeftWidth: 1,
    borderLeftColor: "rgba(255,255,255,0.28)",
    fontFamily: theme.fontFamily.bodyBold,
    fontSize: theme.fontSize.md,
    color: theme.colors.accent,
  },
});
