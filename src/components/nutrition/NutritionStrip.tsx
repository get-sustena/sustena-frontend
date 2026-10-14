import { Pressable, StyleSheet, View } from "react-native";
import { formatWhole } from "../../lib/nutrition/recipeNutrition";
import { theme } from "../../theme/theme";
import type { NutrientValues } from "../../types/api";
import { AppText } from "../ui/AppText";
import { Icon } from "../ui/Icon";
import { nutritionColors, recipeColors } from "./nutritionColors";

type Props = {
  perServing: NutrientValues;
  onPress: () => void;
};

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
            <AppText style={styles.value} numberOfLines={1}>
              {formatWhole(cell.value)}
              <AppText style={styles.unit}>{` ${cell.unit}`}</AppText>
            </AppText>
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
    color: recipeColors.muted,
  },
  value: {
    fontFamily: theme.fontFamily.display,
    fontSize: 19,
    lineHeight: 19,
    letterSpacing: -0.19,
    color: recipeColors.ink,
  },
  unit: {
    fontFamily: theme.fontFamily.bodyMedium,
    fontSize: 12,
    letterSpacing: 0,
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
    color: theme.colors.navy3,
  },
  pressed: {
    opacity: 0.85,
  },
});
