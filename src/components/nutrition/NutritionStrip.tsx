import { Pressable, StyleSheet, View } from "react-native";
import { formatWhole } from "../../lib/nutrition/recipeNutrition";
import { theme } from "../../theme/theme";
import type { NutrientValues } from "../../types/api";
import { AppText } from "../ui/AppText";
import { Icon } from "../ui/Icon";
import { SkeletonBlock, SkeletonGroup } from "../ui/Skeleton";
import { nutritionColors, recipeColors } from "./nutritionColors";

type Props = {
  perServing: NutrientValues;
  onPress: () => void;
};

// Holds the strip's space while the numbers load, in the strip's own shape,
// so the recipe page never jumps when they arrive.
export function NutritionStripSkeleton() {
  return (
    <SkeletonGroup label="Loading nutrition" style={styles.strip}>
      <View style={styles.grid}>
        {[1.15, 1, 1, 1].map((grow, index) => (
          <View key={index} style={[styles.cell, { flex: grow }, index > 0 && styles.cellDivided]}>
            <SkeletonBlock width={index === 0 ? 50 : 42} height={LABEL_LINE} radius={4} />
            <SkeletonBlock width={index === 0 ? 62 : 34} height={VALUE_LINE} radius={4} />
          </View>
        ))}
      </View>
      <View style={styles.foot}>
        <SkeletonBlock width={70} height={FOOT_LINE} radius={4} />
        <SkeletonBlock width={120} height={FOOT_LINE} radius={4} />
      </View>
    </SkeletonGroup>
  );
}

// In the strip's place when the recipe's nutrition couldn't be fetched.
export function NutritionStripError({ onRetry }: { onRetry: () => void }) {
  return (
    <Pressable
      onPress={onRetry}
      style={({ pressed }) => [styles.strip, styles.error, pressed && styles.pressed]}
      accessibilityRole="button"
    >
      <AppText style={styles.errorText}>Couldn’t load nutrition.</AppText>
      <AppText style={styles.moreText}>Try again</AppText>
    </Pressable>
  );
}

const LABEL_LINE = 14;
const VALUE_LINE = 19;
const FOOT_LINE = 16;

// v6.8 .nu-strip: calories, protein, carbs and fat for 1 serving, under the
// recipe's stats. The whole strip opens the nutrition page.
export function NutritionStrip({ perServing, onPress }: Props) {
  const cells = [
    { name: "Calories", value: perServing.kcal, unit: "kcal", dot: null, grow: 1.15 },
    { name: "Protein", value: perServing.proteinG, unit: "g", dot: nutritionColors.protein, grow: 1 },
    { name: "Carbs", value: perServing.carbsG, unit: "g", dot: nutritionColors.carbs, grow: 1 },
    { name: "Fat", value: perServing.fatG, unit: "g", dot: nutritionColors.fat, grow: 1 },
  ];

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.strip, pressed && styles.pressed]}
      accessibilityRole="button"
      accessibilityLabel={`Per serving: ${formatWhole(perServing.kcal)} kcal, ${formatWhole(perServing.proteinG)} g protein, ${formatWhole(perServing.carbsG)} g carbs, ${formatWhole(perServing.fatG)} g fat. See full nutrition`}
    >
      <View style={styles.grid}>
        {cells.map((cell, index) => (
          <View key={cell.name} style={[styles.cell, { flex: cell.grow }, index > 0 && styles.cellDivided]}>
            <View style={styles.label}>
              {cell.dot ? <View style={[styles.dot, { backgroundColor: cell.dot }]} /> : null}
              <AppText style={styles.labelText} numberOfLines={1}>
                {cell.name}
              </AppText>
            </View>
            <View style={styles.valueRow}>
              <AppText style={styles.value} numberOfLines={1}>
                {formatWhole(cell.value)}
              </AppText>
              <AppText style={styles.unit} numberOfLines={1}>
                {cell.unit}
              </AppText>
            </View>
          </View>
        ))}
      </View>
      <View style={styles.foot}>
        <AppText style={styles.footText}>Per serving</AppText>
        <View style={styles.more}>
          <AppText style={styles.moreText}>See full nutrition</AppText>
          <Icon name="chevronRight" size={15} color={theme.colors.navy3} />
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  strip: {
    marginTop: 18,
    borderWidth: 0.75,
    borderColor: recipeColors.line,
    borderRadius: 16,
    backgroundColor: recipeColors.canvas,
  },
  grid: {
    flexDirection: "row",
  },
  cell: {
    minWidth: 0,
    paddingTop: 13,
    paddingRight: 10,
    paddingBottom: 12,
    paddingLeft: 14,
    gap: 4,
  },
  cellDivided: {
    borderLeftWidth: 0.75,
    borderLeftColor: recipeColors.line,
    paddingLeft: 12,
  },
  label: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  labelText: {
    fontFamily: theme.fontFamily.bodyMedium,
    fontSize: 11.5,
    lineHeight: LABEL_LINE,
    color: recipeColors.muted,
  },
  value: {
    fontFamily: theme.fontFamily.display,
    fontSize: 19,
    lineHeight: 19,
    letterSpacing: -0.19,
    color: recipeColors.ink,
  },
  // A fixed height, so the number and its smaller unit (two fonts on one
  // baseline) are exactly as tall as the skeleton that stood in for them.
  valueRow: {
    height: VALUE_LINE,
    flexDirection: "row",
    alignItems: "baseline",
    gap: 2,
  },
  unit: {
    fontFamily: theme.fontFamily.bodyMedium,
    fontSize: 12,
    color: recipeColors.muted,
  },
  foot: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    paddingVertical: 10,
    paddingLeft: 14,
    paddingRight: 12,
    borderTopWidth: 0.75,
    borderTopColor: recipeColors.line,
  },
  footText: {
    fontSize: 12.5,
    lineHeight: FOOT_LINE,
    color: recipeColors.muted,
  },
  more: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  // v6.8 uses Inter 650; 600 is the nearest weight the app loads.
  moreText: {
    fontFamily: theme.fontFamily.bodySemiBold,
    fontSize: 13,
    lineHeight: FOOT_LINE,
    color: theme.colors.navy3,
  },
  error: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    paddingVertical: 14,
    paddingLeft: 14,
    paddingRight: 12,
  },
  errorText: {
    flex: 1,
    fontSize: 13,
    lineHeight: FOOT_LINE,
    color: recipeColors.muted,
  },
  pressed: {
    opacity: 0.85,
  },
});
