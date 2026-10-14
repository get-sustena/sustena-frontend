import { useEffect } from "react";
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { theme } from "../../theme/theme";
import { Icon } from "./Icon";

// v6.8 rdCookedTick: a tick that grows in from 40% over 0.26s, unless the
// phone asks for less motion. "Cooked today" and "Saved" use it.
export function TickIn() {
  const reduceMotion = useReducedMotion();
  const progress = useSharedValue(reduceMotion ? 1 : 0);

  useEffect(() => {
    progress.value = withTiming(1, { duration: 260, easing: Easing.bezier(0.2, 0, 0, 1) });
  }, [progress]);

  const tickStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [{ scale: 0.4 + 0.6 * progress.value }],
  }));

  return (
    <Animated.View style={tickStyle}>
      <Icon name="check" size={18} strokeWidth={2.25} color={theme.colors.navy3} />
    </Animated.View>
  );
}
