import { type ReactNode, useEffect } from "react";
import {
  type DimensionValue,
  type StyleProp,
  View,
  type ViewStyle,
} from "react-native";
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import { theme } from "../../theme/theme";

type GroupProps = {
  // What is loading, as screen readers announce it ("Loading your pantry").
  label: string;
  style?: StyleProp<ViewStyle>;
  children: ReactNode;
};

// One loading area, shaped like the content it stands in for so nothing
// jumps when that content arrives. It pulses gently, holds still when the
// device asks for reduced motion, and reads as a single busy element.
export function SkeletonGroup({ label, style, children }: GroupProps) {
  const reduceMotion = useReducedMotion();
  const pulse = useSharedValue(1);

  useEffect(() => {
    if (reduceMotion) {
      cancelAnimation(pulse);
      pulse.value = 1;
      return;
    }

    pulse.value = 0;
    pulse.value = withRepeat(
      withTiming(1, { duration: 900, easing: Easing.inOut(Easing.ease) }),
      -1,
      true
    );
  }, [pulse, reduceMotion]);

  const pulseStyle = useAnimatedStyle(() => ({
    opacity: 0.58 + pulse.value * 0.42,
  }));

  return (
    <Animated.View
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={label}
      aria-busy
      style={[style, pulseStyle]}
    >
      {children}
    </Animated.View>
  );
}

type BlockProps = {
  width?: DimensionValue;
  // Leave out when the style sets an aspectRatio instead.
  height?: DimensionValue;
  radius?: number;
  // "deep" is for blocks drawn on a tinted card.
  tone?: "light" | "deep";
  style?: StyleProp<ViewStyle>;
};

export function SkeletonBlock({
  width = "100%",
  height,
  radius = 6,
  tone = "light",
  style,
}: BlockProps) {
  return (
    <View
      style={[
        {
          width,
          height,
          borderRadius: radius,
          backgroundColor:
            tone === "deep" ? theme.colors.skeletonDeep : theme.colors.skeleton,
        },
        style,
      ]}
    />
  );
}
