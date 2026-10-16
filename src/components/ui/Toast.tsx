import { useEffect, useState } from "react";
import { Pressable, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
  Easing,
} from "react-native-reanimated";
import { hideToast, useUIStore } from "../../store/uiStore";
import { theme } from "../../theme/theme";
import { AppText } from "./AppText";
import { Icon, type IconName } from "./Icon";

// One wide card at the bottom (PRD v6.9, "Toasts"): 3 seconds, or 5 when it
// offers an action.
const SHOW_MS = 3000;
const SHOW_WITH_ACTION_MS = 5000;
const NO_BAR_GAP = 24;
const ACTION_GREEN = "#8FD6AE";

const TONE_ICONS: Record<"default" | "success" | "danger" | "offline", { name: IconName; color: string }> = {
  default: { name: "check", color: ACTION_GREEN },
  success: { name: "check", color: ACTION_GREEN },
  danger: { name: "alertTriangle", color: "#F2BE5C" },
  offline: { name: "offline", color: "rgba(255,255,255,0.75)" },
};

export function ToastHost() {
  const insets = useSafeAreaInsets();
  const reduceMotion = useReducedMotion();
  const message = useUIStore((state) => state.toastMessage);
  const tone = useUIStore((state) => state.toastTone);
  const actionLabel = useUIStore((state) => state.toastActionLabel);
  const action = useUIStore((state) => state.toastAction);
  const lift = useUIStore((state) => state.toastLift?.value ?? null);
  const opacity = useSharedValue(0);
  const rise = useSharedValue(10);
  const isVisible = message !== null;
  const hasAction = Boolean(actionLabel && action);
  const [actionFocused, setActionFocused] = useState(false);

  useEffect(() => {
    opacity.value = withTiming(isVisible ? 1 : 0, { duration: 180, easing: Easing.out(Easing.quad) });
    rise.value = reduceMotion
      ? 0
      : withTiming(isVisible ? 0 : 10, { duration: 220, easing: Easing.bezier(0.2, 0, 0, 1) });
    if (!isVisible) return;
    const timer = setTimeout(hideToast, hasAction ? SHOW_WITH_ACTION_MS : SHOW_MS);
    return () => clearTimeout(timer);
  }, [isVisible, hasAction, message, opacity, rise, reduceMotion]);

  const toastStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: rise.value }],
  }));

  if (!message) return null;
  const icon = TONE_ICONS[tone];

  return (
    <Animated.View
      role="status"
      accessibilityLiveRegion="polite"
      style={[
        styles.toast,
        hasAction && styles.toastWithAction,
        { bottom: lift ?? insets.bottom + NO_BAR_GAP },
        toastStyle,
      ]}
    >
      <Icon name={icon.name} size={18} color={icon.color} strokeWidth={2} />
      <AppText style={styles.text}>{message}</AppText>
      {hasAction ? (
        <Pressable
          onPress={() => {
            hideToast();
            action?.();
          }}
          accessibilityRole="button"
          onFocus={() => setActionFocused(true)}
          onBlur={() => setActionFocused(false)}
          style={({ pressed, hovered }) => [
            styles.action,
            hovered && styles.actionHovered,
            pressed && styles.actionPressed,
            actionFocused && styles.actionFocused,
          ]}
        >
          <AppText style={styles.actionText}>{actionLabel}</AppText>
        </Pressable>
      ) : null}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  toast: {
    position: "absolute",
    left: 16,
    right: 16,
    zIndex: 300,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    minHeight: 52,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 14,
    backgroundColor: theme.colors.navy,
    boxShadow: "0 14px 30px -14px rgba(23,41,30,0.55), 0 2px 6px rgba(23,41,30,0.14)",
  },
  toastWithAction: { paddingRight: 6 },
  text: {
    flex: 1,
    minWidth: 0,
    fontFamily: theme.fontFamily.bodyMedium,
    fontSize: 14.5,
    lineHeight: 14.5 * 1.35,
    color: theme.colors.white,
  },
  action: {
    height: 40,
    paddingHorizontal: 12,
    borderRadius: 10,
    justifyContent: "center",
  },
  actionHovered: { backgroundColor: "rgba(255,255,255,0.08)" },
  actionPressed: { transform: [{ scale: 0.96 }] },
  actionFocused: { outlineWidth: 2, outlineStyle: "solid", outlineColor: ACTION_GREEN, outlineOffset: 1 },
  actionText: {
    fontFamily: theme.fontFamily.bodySemiBold,
    fontSize: 14.5,
    color: ACTION_GREEN,
  },
});
