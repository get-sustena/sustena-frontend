import { StyleSheet, View } from "react-native";
import {
  formatNutrient,
  formatWhole,
  type NutrientSource,
  type OtherNutrient,
} from "../../lib/nutrition/recipeNutrition";
import { theme } from "../../theme/theme";
import { IngredientImage } from "../ingredient/IngredientImage";
import { AppText } from "../ui/AppText";
import { Icon } from "../ui/Icon";
import { NutrientRing } from "./NutritionGraphics";
import { MACROS, nutritionColors, sourceShade } from "./nutritionColors";

type Macro = (typeof MACROS)[number];

// v6.8 .nd-macro: a macro's grams, its share of a day, and where it comes
// from. The ring and bar picture numbers the text already gives, so screen
// readers skip them.
export function MacroCard({
  macro,
  grams,
  dayPercent,
  sources,
  plates,
}: {
  macro: Macro;
  grams: number;
  dayPercent: number;
  sources: NutrientSource[];
  plates: number;
}) {
  const sourcesTotal = sources.reduce((sum, source) => sum + source.perServing, 0) || 1;

  return (
    <View style={[styles.macro, { backgroundColor: macro.tint }]}>
      <View style={styles.macroTop}>
        <View style={styles.macroRing} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
          <NutrientRing percent={dayPercent} color={macro.hue} size={72} strokeWidth={9} />
          <View style={styles.ringCenter}>
            <Icon name={macro.icon} size={26} strokeWidth={2} color={macro.hue} />
          </View>
        </View>
        <View style={styles.macroText}>
          <AppText style={styles.macroName} accessibilityRole="header">
            {macro.name}
          </AppText>
          <AppText style={styles.macroValue}>
            {formatWhole(grams)}
            <AppText style={styles.macroUnit}> g</AppText>
          </AppText>
          <AppText style={styles.macroDay}>
            <AppText style={styles.strong}>{`${dayPercent}%`}</AppText>
            {" of a day"}
          </AppText>
        </View>
      </View>

      {sources.length ? (
        <>
          <View style={styles.bar} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
            {sources.map((source, index) => {
              const share = source.perServing / sourcesTotal;
              const first = index === 0;
              const last = index === sources.length - 1;
              return (
                <View
                  key={source.label}
                  style={[
                    styles.segment,
                    {
                      flex: share,
                      backgroundColor: sourceShade(macro.hue, index),
                      borderTopLeftRadius: first ? 8 : 3,
                      borderBottomLeftRadius: first ? 8 : 3,
                      borderTopRightRadius: last ? 8 : 3,
                      borderBottomRightRadius: last ? 8 : 3,
                    },
                  ]}
                >
                  {source.ingredient && share >= 0.16 ? (
                    <IngredientImage
                      ingredientId={source.ingredient.ingredientId}
                      name={source.label}
                      size={30}
                    />
                  ) : null}
                </View>
              );
            })}
          </View>
          <View style={styles.keys}>
            {sources.map((source, index) => (
              <View key={source.label} style={styles.key}>
                <View style={[styles.keyDot, { backgroundColor: sourceShade(macro.hue, index) }]} />
                <AppText style={styles.keyText}>
                  {`${source.label} `}
                  <AppText style={styles.strong}>{`${formatNutrient(source.perServing * plates, macro.key)} g`}</AppText>
                </AppText>
              </View>
            ))}
          </View>
        </>
      ) : null}
    </View>
  );
}

const TAG_COLORS = { good: nutritionColors.good, watch: nutritionColors.watch } as const;
const ROW_TINTS = { good: nutritionColors.tintProtein, watch: nutritionColors.tintCarbs } as const;

// v6.8 .nd-other: one row per nutrient with its share of a day. The tag is a
// word with an icon, never colour alone.
export function OtherNutrientRow({ nutrient }: { nutrient: OtherNutrient }) {
  const color = nutrient.tag ? TAG_COLORS[nutrient.tag] : nutritionColors.soft;

  return (
    <View
      style={[styles.other, { backgroundColor: nutrient.tag ? ROW_TINTS[nutrient.tag] : nutritionColors.tintFat }]}
      accessible
      accessibilityLabel={`${nutrient.name}, ${formatNutrient(nutrient.amount, nutrient.key)} ${nutrient.unit}, ${nutrient.share}% of a day${nutrient.tag ? `, ${nutrient.tag === "watch" ? "Go easy" : "Good"}` : ""}`}
    >
      <View style={styles.otherRing}>
        <NutrientRing percent={nutrient.share} color={color} size={56} strokeWidth={5} />
        <View style={styles.ringCenter}>
          <AppText style={styles.otherPercent}>{`${nutrient.share}%`}</AppText>
        </View>
      </View>
      <View style={styles.otherText}>
        <AppText style={styles.otherName}>{nutrient.name}</AppText>
        <AppText style={styles.otherAmount}>
          {`${formatNutrient(nutrient.amount, nutrient.key)} ${nutrient.unit}`}
        </AppText>
      </View>
      {nutrient.tag ? (
        <View style={styles.tag}>
          <Icon
            name={nutrient.tag === "watch" ? "alertTriangle" : "circleCheck"}
            size={15}
            strokeWidth={2}
            color={color}
          />
          <AppText style={styles.tagText}>{nutrient.tag === "watch" ? "Go easy" : "Good"}</AppText>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  macro: {
    padding: 16,
    borderRadius: 24,
  },
  macroTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  macroRing: {
    width: 72,
    height: 72,
  },
  ringCenter: {
    ...StyleSheet.absoluteFill,
    alignItems: "center",
    justifyContent: "center",
  },
  macroText: {
    flex: 1,
    minWidth: 0,
  },
  // v6.8 uses Inter 650; 600 is the nearest weight the app loads.
  macroName: {
    fontFamily: theme.fontFamily.bodySemiBold,
    fontSize: 15,
    lineHeight: 18,
    color: theme.colors.navy,
  },
  macroValue: {
    marginTop: 4,
    fontFamily: theme.fontFamily.displayExtraBold,
    fontSize: 34,
    lineHeight: 34,
    letterSpacing: -0.85,
    color: theme.colors.navy,
  },
  macroUnit: {
    fontFamily: theme.fontFamily.bodyMedium,
    fontSize: 15,
    letterSpacing: 0,
    color: theme.colors.textMedium,
  },
  macroDay: {
    marginTop: 5,
    fontSize: 13,
    color: theme.colors.textMedium,
  },
  strong: {
    fontFamily: theme.fontFamily.bodySemiBold,
    color: theme.colors.navy,
  },
  bar: {
    flexDirection: "row",
    gap: 2,
    height: 44,
    marginTop: 16,
  },
  segment: {
    minWidth: 6,
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  keys: {
    flexDirection: "row",
    flexWrap: "wrap",
    columnGap: 14,
    rowGap: 6,
    marginTop: 10,
  },
  key: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  keyDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: nutritionColors.edge,
  },
  keyText: {
    fontSize: 13,
    color: theme.colors.textMedium,
  },
  other: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    minHeight: 80,
    padding: 12,
    borderRadius: 18,
  },
  otherRing: {
    width: 56,
    height: 56,
  },
  otherPercent: {
    fontFamily: theme.fontFamily.display,
    fontSize: 13,
    color: theme.colors.navy,
  },
  otherText: {
    flex: 1,
    minWidth: 0,
  },
  otherName: {
    fontFamily: theme.fontFamily.bodySemiBold,
    fontSize: 15,
    lineHeight: 18.75,
    color: theme.colors.navy,
  },
  otherAmount: {
    marginTop: 2,
    fontSize: 13,
    color: theme.colors.textMedium,
  },
  tag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    minHeight: 28,
    paddingLeft: 8,
    paddingRight: 10,
    borderRadius: 999,
    backgroundColor: nutritionColors.chip,
  },
  tagText: {
    fontFamily: theme.fontFamily.bodySemiBold,
    fontSize: 13,
    color: theme.colors.navy,
  },
});
