import { useEffect } from "react";
import { Pressable, StyleSheet } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { useRecipeCooked } from "../../hooks/api/useRecipeCooked";
import type { RecipeSource } from "../../lib/recipeSource";
import { theme } from "../../theme/theme";
import { AppText } from "../ui/AppText";
import { Icon } from "../ui/Icon";

type Props = {
  recipeId: string;
  source?: RecipeSource;
};

// "I cooked it" (PRD v6.8 section 16), as v6.8's secondary pill (.co-secondary).
export function CookedButton({ recipeId, source }: Props) {
  const { cookedToday, isSaving, markCooked } = useRecipeCooked(recipeId, source);

  return (
    <Pressable
      onPress={markCooked}
      disabled={cookedToday || isSaving}
      accessibilityRole="button"
      accessibilityState={{ disabled: cookedToday || isSaving, busy: isSaving }}
      style={({ pressed }) => [
        styles.button,
        cookedToday && styles.buttonCooked,
        pressed && styles.pressed,
      ]}
    >
      {cookedToday ? (
        <>
          <CookedTick />
          <AppText style={[styles.label, styles.labelCooked]}>Cooked today</AppText>
        </>
      ) : (
        <>
          <Icon name="chefHat" size={18} color={theme.colors.navy} />
          <AppText style={styles.label}>I cooked it</AppText>
        </>
      )}
    </Pressable>
  );
}

// v6.8 rdCookedTick: the tick grows in from 40% over 0.26s, unless the phone
// asks for less motion.
function CookedTick() {
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

const styles = StyleSheet.create({
  button: {
    minHeight: 52,
    paddingHorizontal: 20,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: theme.colors.lineStrong,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  buttonCooked: {
    borderColor: theme.colors.navy3,
  },
  pressed: {
    opacity: 0.85,
  },
  label: {
    fontFamily: theme.fontFamily.bodySemiBold,
    fontSize: 15,
    color: theme.colors.navy,
  },
  labelCooked: {
    color: theme.colors.navy3,
  },
});
