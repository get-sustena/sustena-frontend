import { Pressable, StyleSheet, View } from "react-native";
import {
  DAILY_VALUES,
  formatWhole,
  mealFills,
  PLATES,
} from "../../lib/nutrition/recipeNutrition";
import { theme } from "../../theme/theme";
import { AppText } from "../ui/AppText";
import { PlatePicture } from "./NutritionGraphics";
import { nutritionColors } from "./nutritionColors";

type Props = {
  recipeName: string;
  plates: number;
  kcal: number;
  dayPercent: number;
  onPickPlates: (plates: number) => void;
};

const MEALS = ["Breakfast", "Lunch", "Dinner"];

// The top of the nutrition page (v6.8 .nc-hero): how much you eat, the
// calories for it, and how much of a day's three meals that fills.
export function NutritionHero({ recipeName, plates, kcal, dayPercent, onPickPlates }: Props) {
  const fills = mealFills(kcal);
  const meal = formatWhole(DAILY_VALUES.kcal / 3);

  return (
    <View style={styles.hero}>
      <AppText style={styles.eyebrow}>{recipeName}</AppText>

      <View style={styles.plates} role="radiogroup" aria-label="How much you eat">
        {PLATES.map((plate) => {
          const selected = plate.amount === plates;
          return (
            <Pressable
              key={plate.label}
              onPress={() => onPickPlates(plate.amount)}
              style={[styles.plate, selected && styles.plateSelected]}
              role="radio"
              aria-checked={selected}
              aria-label={plate.label}
            >
              <View style={styles.platePictures}>
                {plate.pictures.map((fill, index) => (
                  <View key={index} style={index > 0 && styles.plateOverlap}>
                    <PlatePicture fill={fill} />
                  </View>
                ))}
              </View>
              <AppText style={styles.plateLabel} numberOfLines={1}>
                {plate.label}
              </AppText>
            </Pressable>
          );
        })}
      </View>
      <AppText style={styles.plateNote}>1 plate = 1 serving of this recipe</AppText>

      <View style={styles.big}>
        <AppText style={styles.bigValue}>{formatWhole(kcal)}</AppText>
        <AppText style={styles.bigUnit}>kcal</AppText>
      </View>
      <AppText style={styles.day}>
        <AppText style={styles.dayStrong}>{`${dayPercent}%`}</AppText>
        {" of a 2,000 kcal day"}
      </AppText>

      <View
        style={styles.meals}
        accessibilityRole="image"
        accessibilityLabel={`Against 3 meals of ${meal} kcal: breakfast ${fills[0]}%, lunch ${fills[1]}%, dinner ${fills[2]}%`}
      >
        {MEALS.map((name, index) => (
          <View key={name} style={styles.meal}>
            <View style={styles.mealBar}>
              <View style={[styles.mealFill, { width: `${fills[index]}%` }]} />
            </View>
            <AppText style={styles.mealName}>{name}</AppText>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: {
    paddingTop: 4,
    paddingHorizontal: 20,
    paddingBottom: 28,
  },
  eyebrow: {
    fontFamily: theme.fontFamily.bodyMedium,
    fontSize: 15,
    lineHeight: 19.5,
    color: theme.colors.textMedium,
  },
  plates: {
    flexDirection: "row",
    gap: 4,
    marginTop: 12,
    padding: 4,
    borderRadius: 18,
    backgroundColor: nutritionColors.well,
  },
  plate: {
    flex: 1,
    minWidth: 0,
    minHeight: 56,
    paddingVertical: 6,
    paddingHorizontal: 2,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  plateSelected: {
    backgroundColor: nutritionColors.chip,
    boxShadow: `0px 1px 2px ${nutritionColors.shadow}, 0px 4px 10px ${nutritionColors.shadow}`,
  },
  platePictures: {
    flexDirection: "row",
    height: 20,
  },
  plateOverlap: {
    marginLeft: -6,
  },
  // v6.8 uses Inter 650; 600 is the nearest weight the app loads.
  plateLabel: {
    fontFamily: theme.fontFamily.bodySemiBold,
    fontSize: 13,
    color: theme.colors.navy,
  },
  plateNote: {
    marginTop: 8,
    fontSize: 13,
    color: theme.colors.textMedium,
  },
  big: {
    marginTop: 20,
    flexDirection: "row",
    alignItems: "baseline",
    gap: 8,
  },
  bigValue: {
    fontFamily: theme.fontFamily.displayExtraBold,
    fontSize: 60,
    lineHeight: 57,
    letterSpacing: -1.8,
    color: theme.colors.navy,
  },
  bigUnit: {
    fontFamily: theme.fontFamily.bodyMedium,
    fontSize: 15,
    color: theme.colors.textMedium,
  },
  day: {
    marginTop: 10,
    fontSize: 15,
    color: theme.colors.textMedium,
  },
  dayStrong: {
    fontFamily: theme.fontFamily.bodySemiBold,
    color: theme.colors.navy,
  },
  meals: {
    flexDirection: "row",
    gap: 6,
    marginTop: 16,
  },
  meal: {
    flex: 1,
  },
  mealBar: {
    height: 40,
    borderRadius: 13,
    overflow: "hidden",
    backgroundColor: nutritionColors.track,
    boxShadow: `inset 0px 0px 0px 0.75px ${nutritionColors.shadow}`,
  },
  mealFill: {
    height: "100%",
    backgroundColor: nutritionColors.carbs,
  },
  mealName: {
    marginTop: 6,
    fontFamily: theme.fontFamily.bodySemiBold,
    fontSize: 13,
    textAlign: "center",
    color: theme.colors.textMedium,
  },
});
