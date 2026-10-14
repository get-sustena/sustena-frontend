import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { NutritionDetailsSheet } from "../../src/components/nutrition/NutritionDetailsSheet";
import { NutritionHero } from "../../src/components/nutrition/NutritionHero";
import { nutritionColors } from "../../src/components/nutrition/nutritionColors";
import { AppText } from "../../src/components/ui/AppText";
import { Icon } from "../../src/components/ui/Icon";
import { ProgressLoader } from "../../src/components/ui/ProgressLoader";
import { useLoadedRecipeDetail } from "../../src/hooks/api/useRecipes";
import { amountFor, dayShare, PLATES } from "../../src/lib/nutrition/recipeNutrition";
import { readRecipeSource } from "../../src/lib/recipeSource";
import { theme } from "../../src/theme/theme";

// The nutrition page (PRD v6.8 section 15). 1 plate is 1 serving; every
// number follows the plates picked, and the top bar always says how many.
export default function RecipeNutritionScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ id: string; source?: string }>();
  const recipeQuery = useLoadedRecipeDetail(params.id, readRecipeSource(params.source));
  const recipe = recipeQuery.data;
  const perServing = recipe?.nutritionPerServing ?? null;

  const [plates, setPlates] = useState(1);
  const [topBarHeight, setTopBarHeight] = useState(0);
  const [scrolled, setScrolled] = useState(false);

  if (recipeQuery.isLoading) return <ProgressLoader variant="screen" />;

  const plateLabel = PLATES.find((plate) => plate.amount === plates)?.label ?? "1 plate";
  const kcal = perServing ? amountFor(perServing, "kcal", plates) : 0;

  return (
    <View style={styles.root}>
      <View
        style={[styles.topBar, { paddingTop: insets.top + 8 }, scrolled && styles.topBarScrolled]}
        onLayout={(event) => setTopBarHeight(event.nativeEvent.layout.height)}
      >
        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => [styles.back, pressed && styles.pressed]}
          accessibilityRole="button"
          accessibilityLabel="Back to recipe"
        >
          <Icon name="chevronLeft" size={22} color={theme.colors.navy} />
        </Pressable>
        <View style={styles.topText}>
          <AppText style={styles.title} accessibilityRole="header">
            Nutrition
          </AppText>
          {perServing ? <AppText style={styles.subtitle}>{`For ${plateLabel}`}</AppText> : null}
        </View>
        <View style={styles.back} />
      </View>

      {recipe && perServing ? (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={{ paddingTop: topBarHeight }}
          scrollEventThrottle={16}
          onScroll={(event) => setScrolled(event.nativeEvent.contentOffset.y > 4)}
          showsVerticalScrollIndicator={false}
        >
          <NutritionHero
            recipeName={recipe.name}
            plates={plates}
            kcal={kcal}
            dayPercent={dayShare(kcal, "kcal")}
            onPickPlates={setPlates}
          />
          <NutritionDetailsSheet
            recipe={recipe}
            perServing={perServing}
            plates={plates}
            bottomInset={insets.bottom}
          />
        </ScrollView>
      ) : (
        <View style={[styles.empty, { paddingTop: topBarHeight + 24 }]}>
          <AppText style={styles.emptyText}>This recipe has no nutrition yet.</AppText>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: nutritionColors.canvas,
  },
  topBar: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 6,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingBottom: 8,
    backgroundColor: nutritionColors.canvas,
  },
  topBarScrolled: {
    boxShadow: `0px 0.75px 0px ${nutritionColors.shadow}`,
  },
  back: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  topText: {
    flex: 1,
    minWidth: 0,
    alignItems: "center",
  },
  // v6.8 uses Inter 650; 600 is the nearest weight the app loads.
  title: {
    fontFamily: theme.fontFamily.bodySemiBold,
    fontSize: 15,
    lineHeight: 18.75,
    color: theme.colors.navy,
  },
  subtitle: {
    marginTop: 1,
    fontSize: 13,
    lineHeight: 17,
    color: theme.colors.textMedium,
  },
  scroll: {
    flex: 1,
  },
  empty: {
    paddingHorizontal: 20,
  },
  emptyText: {
    fontSize: 15,
    color: theme.colors.textMedium,
  },
  pressed: {
    opacity: 0.85,
  },
});
