import { useEffect, type PropsWithChildren } from "react";
import type { StyleProp, ViewStyle } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

type Props = PropsWithChildren<{ style?: StyleProp<ViewStyle> }>;

// v6.8 lmPop: a note or the "Time for the next step" card rises in over 0.3s
// when it appears, unless the phone asks for less motion.
export function PopIn({ style, children }: Props) {
  const reduceMotion = useReducedMotion();
  const progress = useSharedValue(reduceMotion ? 1 : 0);

  useEffect(() => {
    progress.value = withTiming(1, { duration: 300, easing: Easing.bezier(0.2, 0, 0, 1) });
  }, [progress]);

  const popStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [
      { translateY: 6 * (1 - progress.value) },
      { scale: 0.98 + 0.02 * progress.value },
    ],
  }));

  return <Animated.View style={[style, popStyle]}>{children}</Animated.View>;
}
