import { StyleSheet, View } from "react-native";
import {
  amountFor,
  dayShare,
  macroSources,
  nutritionFootnote,
  otherNutrients,
} from "../../lib/nutrition/recipeNutrition";
import { theme } from "../../theme/theme";
import type { NutrientValues, RecipeDetail } from "../../types/api";
import { AppText } from "../ui/AppText";
import { MacroCard, OtherNutrientRow } from "./NutritionDetails";
import { MACROS, nutritionColors } from "./nutritionColors";

type Props = {
  recipe: RecipeDetail;
  perServing: NutrientValues;
  plates: number;
  bottomInset: number;
};

// The white sheet under the calories (v6.8 .nc-sheet): protein, carbs and
// fat with where each comes from, the other nutrients, and the footnote.
export function NutritionDetailsSheet({ recipe, perServing, plates, bottomInset }: Props) {
  const baseServings = recipe.baseServings ?? 1;

  return (
    <View style={[styles.sheet, { paddingBottom: 40 + bottomInset }]}>
      <View style={styles.macros}>
        {MACROS.map((macro) => {
          const grams = amountFor(perServing, macro.key, plates);
          return (
            <MacroCard
              key={macro.key}
              macro={macro}
              grams={grams}
              dayPercent={dayShare(grams, macro.key)}
              sources={macroSources(recipe.ingredients, macro.key, baseServings)}
              plates={plates}
            />
          );
        })}
      </View>

      <View style={styles.heading}>
        <AppText style={styles.headingText} accessibilityRole="header">
          Other nutrients
        </AppText>
        <AppText style={styles.headingNote} accessibilityElementsHidden importantForAccessibility="no">
          % of a day
        </AppText>
      </View>
      <View style={styles.others}>
        {otherNutrients(perServing, plates).map((nutrient) => (
          <OtherNutrientRow key={nutrient.key} nutrient={nutrient} />
        ))}
      </View>

      <AppText style={styles.foot}>{nutritionFootnote(recipe.ingredients)}</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  sheet: {
    paddingTop: 24,
    paddingHorizontal: 16,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    backgroundColor: nutritionColors.sheet,
  },
  macros: {
    gap: 10,
  },
  heading: {
    marginTop: 34,
    marginBottom: 12,
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
    gap: 12,
  },
  headingText: {
    fontFamily: theme.fontFamily.display,
    fontSize: 20,
    letterSpacing: -0.4,
    color: theme.colors.navy,
  },
  headingNote: {
    fontFamily: theme.fontFamily.bodyMedium,
    fontSize: 13,
    color: theme.colors.textMedium,
  },
  others: {
    gap: 8,
  },
  foot: {
    marginTop: 28,
    fontSize: 13,
    lineHeight: 19.5,
    color: theme.colors.textMedium,
  },
});
