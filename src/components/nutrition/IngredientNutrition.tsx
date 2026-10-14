import { useEffect } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { formatWhole, type IngredientCalories } from "../../lib/nutrition/recipeNutrition";
import { theme } from "../../theme/theme";
import { AppText } from "../ui/AppText";
import { Icon } from "../ui/Icon";
import { recipeColors } from "./nutritionColors";

// v6.8 .nu-ing-sub: the line under an ingredient's name.
export function IngredientCaloriesLine({ calories }: { calories: IngredientCalories }) {
  if (!calories.counted) return <AppText style={styles.line}>Not counted</AppText>;

  return (
    <AppText style={styles.line}>
      {`${formatWhole(calories.kcal)} kcal`}
      {calories.share ? (
        <>
          {" · "}
          <AppText style={styles.share}>{calories.share}</AppText>
        </>
      ) : null}
    </AppText>
  );
}

// v6.8 .nu-eye: shows or hides every ingredient's calorie line. The eye and
// the crossed-out eye swap over 0.3s, unless the phone asks for less motion.
export function CaloriesEyeButton({ shown, onToggle }: { shown: boolean; onToggle: () => void }) {
  const reduceMotion = useReducedMotion();
  const progress = useSharedValue(shown ? 1 : 0);

  useEffect(() => {
    progress.value = withTiming(shown ? 1 : 0, {
      duration: reduceMotion ? 0 : 300,
      easing: Easing.bezier(0.2, 0, 0, 1),
    });
  }, [progress, reduceMotion, shown]);

  const eyeStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [{ scale: 0.25 + 0.75 * progress.value }],
  }));
  const eyeOffStyle = useAnimatedStyle(() => ({
    opacity: 1 - progress.value,
    transform: [{ scale: 1 - 0.75 * progress.value }],
  }));
  const color = shown ? recipeColors.ink : recipeColors.muted;

  return (
    <Pressable
      onPress={onToggle}
      style={({ pressed }) => [styles.eye, pressed && styles.pressed]}
      role="switch"
      aria-label="Show calories"
      aria-checked={shown}
    >
      <View style={styles.eyeCircle}>
        <Animated.View style={[styles.eyeIcon, eyeStyle]}>
          <Icon name="eye" size={18} color={color} />
        </Animated.View>
        <Animated.View style={[styles.eyeIcon, eyeOffStyle]}>
          <Icon name="eyeOff" size={18} color={color} />
        </Animated.View>
      </View>
    </Pressable>
  );
}

// v6.8 .nu-tip, under the first step that mentions oil.
export function OilTip({ saveKcal }: { saveKcal: number }) {
  return (
    <View style={styles.tip}>
      <View style={styles.tipIcon}>
        <Icon name="vegetarian" size={15} color={theme.colors.navy3} />
      </View>
      <AppText style={styles.tipText}>
        <AppText style={styles.tipLead}>Lighter:</AppText>
        {` using half the oil cuts about ${formatWhole(saveKcal)} kcal from each serving.`}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  line: {
    marginTop: 3,
    fontSize: 12.5,
    lineHeight: 16.25,
    fontVariant: ["tabular-nums"],
    color: recipeColors.muted,
  },
  share: {
    fontFamily: theme.fontFamily.bodyMedium,
    color: recipeColors.text,
  },
  // A 44px target around a 36px circle; the negative margins keep the
  // heading row its usual height.
  eye: {
    width: 44,
    height: 44,
    marginVertical: -11,
    marginRight: -4,
    marginLeft: "auto",
    alignItems: "center",
    justifyContent: "center",
  },
  eyeCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 0.75,
    borderColor: recipeColors.line,
    backgroundColor: recipeColors.paper,
  },
  eyeIcon: {
    ...StyleSheet.absoluteFill,
    alignItems: "center",
    justifyContent: "center",
  },
  tip: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 7,
    marginTop: 9,
  },
  tipIcon: {
    marginTop: 2,
  },
  tipText: {
    flex: 1,
    fontSize: 13.5,
    lineHeight: 19.6,
    color: recipeColors.muted,
  },
  // v6.8 uses Inter 650; 600 is the nearest weight the app loads.
  tipLead: {
    fontFamily: theme.fontFamily.bodySemiBold,
    color: theme.colors.navy3,
  },
  pressed: {
    opacity: 0.85,
  },
});
