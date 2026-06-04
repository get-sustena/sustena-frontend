// app/recipes/[id].tsx

import * as Haptics from "expo-haptics";
import { router, useLocalSearchParams } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { useMemo, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { ServingSizeControl } from "../../src/components/recipe/ServingSizeControl";
import { AppText } from "../../src/components/ui/AppText";
import { Button } from "../../src/components/ui/Button";
import { Screen } from "../../src/components/ui/Screen";
import { RECIPES } from "../../src/data/recipes";
import {
  deleteFavoriteRecipe,
  insertFavoriteRecipe,
} from "../../src/db/favoritesRepository";
import { insertShoppingListItems } from "../../src/db/shoppingListRepository";
import { formatNaira } from "../../src/lib/formatters";
import {
  createInitialIngredientUnitSelections,
  getNextUnitMode,
  getUnitModeLabel,
} from "../../src/lib/ingredientUnits";
import { scaleAmountText, scaleCost } from "../../src/lib/scaling";
import { generateShoppingListItemsFromRecipe } from "../../src/lib/shoppingListGenerator";
import { useFavoritesStore } from "../../src/store/favoritesStore";
import { usePreferencesStore } from "../../src/store/preferencesStore";
import { useShoppingListStore } from "../../src/store/shoppingListStore";
import { theme } from "../../src/theme/theme";

export default function RecipeDetailScreen() {
  const db = useSQLiteContext();
  const { id } = useLocalSearchParams<{ id: string }>();

  const recipe = RECIPES.find((item) => item.id === id);

  const defaultServingSize = usePreferencesStore(
    (state) => state.defaultServingSize
  );
  const defaultUnitMode = usePreferencesStore((state) => state.defaultUnitMode);
  const hapticsEnabled = usePreferencesStore((state) => state.hapticsEnabled);

  const addItems = useShoppingListStore((state) => state.addItems);

  const [servings, setServings] = useState(defaultServingSize);

  const isFavorite = useFavoritesStore((state) =>
    recipe ? state.isFavorite(recipe.id) : false
  );
  const toggleFavorite = useFavoritesStore((state) => state.toggleFavorite);

  const [ingredientUnitSelections, setIngredientUnitSelections] = useState(
    () => {
      if (!recipe) return {};

      return createInitialIngredientUnitSelections({
        recipe,
        defaultUnitMode,
      });
    }
  );

  const scaledCost = useMemo(() => {
    if (!recipe) return 0;

    return scaleCost({
      baseCost: recipe.cost,
      baseServings: recipe.baseServings,
      selectedServings: servings,
    });
  }, [recipe, servings]);

  const costPerPerson = servings > 0 ? Math.round(scaledCost / servings) : 0;

  async function handleFavoritePress() {
    if (!recipe) return;

    if (hapticsEnabled) {
      Haptics.selectionAsync();
    }

    const nextIsFavorite = toggleFavorite(recipe.id);

    try {
      if (nextIsFavorite) {
        await insertFavoriteRecipe(db, recipe.id);
      } else {
        await deleteFavoriteRecipe(db, recipe.id);
      }
    } catch (error) {
      console.error("Failed to persist favorite", error);
    }
  }

  function handleIngredientUnitPress(ingredientId: string) {
    if (hapticsEnabled) {
      Haptics.selectionAsync();
    }

    setIngredientUnitSelections((current) => {
      const currentUnit = current[ingredientId] ?? defaultUnitMode;

      return {
        ...current,
        [ingredientId]: getNextUnitMode(currentUnit),
      };
    });
  }

  async function handleAddToShoppingList() {
    if (!recipe) return;

    const items = generateShoppingListItemsFromRecipe({
      recipe,
      selectedServings: servings,
      ingredientUnitSelections,
    });

    addItems(items);

    try {
      await insertShoppingListItems(db, items);
    } catch (error) {
      console.error("Failed to persist shopping list items", error);
    }

    if (hapticsEnabled) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }

    router.push("/(tabs)/shopping");
  }

  if (!recipe) {
    return (
      <Screen>
        <View style={styles.center}>
          <AppText variant="title">Recipe not found</AppText>

          <Pressable onPress={() => router.back()} style={styles.backButton}>
            <AppText style={styles.backText}>Go back</AppText>
          </Pressable>
        </View>
      </Screen>
    );
  }

  return (
    <View style={styles.root}>
      <Screen scroll contentContainerStyle={styles.scrollContent}>
        <View style={styles.hero}>
          <Decorations />

          <Pressable onPress={() => router.back()} style={styles.heroBack}>
            <AppText style={styles.backIcon}>←</AppText>
          </Pressable>

          <Pressable onPress={handleFavoritePress} style={styles.heroSave}>
            <AppText>{isFavorite ? "❤️" : "🤍"}</AppText>
          </Pressable>

          <AppText style={styles.heroEmoji}>{recipe.emoji}</AppText>

          <View style={styles.heroBody}>
            <View style={styles.tagRow}>
              {recipe.tags.slice(0, 2).map((tag) => (
                <View key={tag} style={styles.tag}>
                  <AppText style={styles.tagText}>{tag}</AppText>
                </View>
              ))}
            </View>

            <AppText style={styles.heroTitle}>{recipe.name}</AppText>

            <View style={styles.statRow}>
              <AppText style={styles.stat}>⏱ {recipe.time}</AppText>
              <AppText style={styles.stat}>🔥 {recipe.calories} kcal</AppText>
              <AppText style={styles.stat}>👨‍🍳 {recipe.difficulty}</AppText>
            </View>
          </View>
        </View>

        <View style={styles.body}>
          <ServingSizeControl value={servings} onChange={setServings} />

          <View style={styles.costCard}>
            <View>
              <AppText style={styles.costLabel}>Estimated Cost</AppText>
              <AppText style={styles.costValue}>
                {formatNaira(scaledCost)}
              </AppText>
            </View>

            <View style={styles.costRight}>
              <AppText style={styles.costLabel}>Per Person</AppText>
              <AppText style={styles.perPersonValue}>
                {formatNaira(costPerPerson)}
              </AppText>
            </View>
          </View>

          <View style={styles.infoCard}>
            <AppText style={styles.infoIcon}>📏</AppText>

            <View style={styles.infoTextWrap}>
              <AppText style={styles.infoTitle}>Per-ingredient units</AppText>
              <AppText style={styles.infoText}>
                Tap each ingredient’s unit pill to switch between metric, cups,
                and imperial measurements.
              </AppText>
            </View>
          </View>

          <AppText variant="label" style={styles.sectionLabel}>
            Ingredients
          </AppText>

          <View style={styles.ingredientsCard}>
            {recipe.ingredients.map((ingredient) => {
              const selectedUnitMode =
                ingredientUnitSelections[ingredient.id] ?? defaultUnitMode;

              const originalAmount = ingredient.amount[selectedUnitMode];

              const scaledAmount = scaleAmountText({
                amount: originalAmount,
                baseServings: recipe.baseServings,
                selectedServings: servings,
              });

              return (
                <View key={ingredient.id} style={styles.ingredientItem}>
                  <AppText style={styles.ingredientEmoji}>
                    {ingredient.emoji}
                  </AppText>

                  <View style={styles.ingredientInfo}>
                    <AppText style={styles.ingredientName}>
                      {ingredient.name}
                    </AppText>

                    <AppText style={styles.ingredientAmount}>
                      {scaledAmount}
                    </AppText>
                  </View>

                  <Pressable
                    onPress={() => handleIngredientUnitPress(ingredient.id)}
                    style={({ pressed }) => [
                      styles.unitPill,
                      pressed && styles.pressed,
                    ]}
                  >
                    <AppText style={styles.unitPillText}>
                      {getUnitModeLabel(selectedUnitMode)}
                    </AppText>
                  </Pressable>
                </View>
              );
            })}
          </View>

          <AppText variant="label" style={styles.sectionLabel}>
            Instructions
          </AppText>

          <View style={styles.stepsCard}>
            {recipe.steps.map((step, index) => (
              <View key={`${step}-${index}`} style={styles.stepItem}>
                <View style={styles.stepNumber}>
                  <AppText style={styles.stepNumberText}>{index + 1}</AppText>
                </View>

                <AppText style={styles.stepText}>{step}</AppText>
              </View>
            ))}
          </View>

          {recipe.tools.length > 0 ? (
            <>
              <AppText variant="label" style={styles.sectionLabel}>
                Helpful Tools
              </AppText>

              <View style={styles.toolSection}>
                {recipe.tools.map((tool) => (
                  <View key={tool.id} style={styles.toolItem}>
                    <AppText style={styles.toolEmoji}>{tool.emoji}</AppText>

                    <View style={styles.toolInfo}>
                      <AppText style={styles.toolName}>{tool.name}</AppText>
                      <AppText style={styles.toolPrice}>
                        {formatNaira(tool.price)} · Available on GoLemon
                      </AppText>
                    </View>

                    <Pressable style={styles.toolAddButton}>
                      <AppText style={styles.toolAddText}>+ Add</AppText>
                    </Pressable>
                  </View>
                ))}
              </View>
            </>
          ) : null}
        </View>
      </Screen>

      <View style={styles.ctaBar}>
        <View style={styles.totalBadge}>
          <AppText style={styles.totalLabel}>Total</AppText>
          <AppText style={styles.totalValue}>{formatNaira(scaledCost)}</AppText>
        </View>

        <Button
          title="🛒 Add to Shopping List"
          variant="accent"
          onPress={handleAddToShoppingList}
          style={styles.ctaButton}
        />
      </View>
    </View>
  );
}

function Decorations() {
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <AppText style={[styles.deco, styles.decoLeaf]}>🌿</AppText>
      <AppText style={[styles.deco, styles.decoPepper]}>🌶️</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scrollContent: {
    paddingBottom: 124,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: theme.spacing.lg,
  },
  backButton: {
    paddingHorizontal: theme.spacing.xl,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.surface,
  },
  backText: {
    color: theme.colors.orange,
    fontFamily: theme.fontFamily.bodyBold,
  },
  hero: {
    height: 300,
    backgroundColor: theme.colors.navy,
    justifyContent: "flex-end",
    overflow: "hidden",
  },
  heroBack: {
    position: "absolute",
    top: 54,
    left: 18,
    width: 40,
    height: 40,
    borderRadius: 13,
    backgroundColor: "rgba(245,237,218,0.12)",
    borderWidth: 1,
    borderColor: "rgba(245,237,218,0.16)",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 2,
  },
  backIcon: {
    fontSize: 20,
    color: theme.colors.onDark,
  },
  heroSave: {
    position: "absolute",
    top: 54,
    right: 18,
    width: 40,
    height: 40,
    borderRadius: 13,
    backgroundColor: "rgba(245,237,218,0.12)",
    borderWidth: 1,
    borderColor: "rgba(245,237,218,0.16)",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 2,
  },
  heroEmoji: {
    position: "absolute",
    alignSelf: "center",
    top: 84,
    fontSize: 112,
  },
  heroBody: {
    paddingHorizontal: 20,
    paddingBottom: 22,
    zIndex: 1,
  },
  tagRow: {
    flexDirection: "row",
    gap: 6,
    marginBottom: theme.spacing.sm,
  },
  tag: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: theme.radius.full,
    backgroundColor: "rgba(232,93,4,0.18)",
  },
  tagText: {
    fontFamily: theme.fontFamily.bodyBold,
    fontSize: 9,
    color: theme.colors.orange2,
  },
  heroTitle: {
    fontFamily: theme.fontFamily.display,
    fontSize: 30,
    lineHeight: 34,
    color: theme.colors.onDark,
    marginBottom: theme.spacing.md,
  },
  statRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.spacing.md,
  },
  stat: {
    fontFamily: theme.fontFamily.bodySemiBold,
    fontSize: 12,
    color: theme.colors.onDark2,
  },
  body: {
    padding: 20,
  },
  costCard: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.lg,
    paddingVertical: theme.spacing.lg,
    paddingHorizontal: theme.spacing.xl,
    marginBottom: theme.spacing.lg,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  costRight: {
    alignItems: "flex-end",
  },
  costLabel: {
    fontFamily: theme.fontFamily.bodyBold,
    fontSize: 10,
    color: theme.colors.textMuted,
    letterSpacing: 1.2,
    textTransform: "uppercase",
    marginBottom: 3,
  },
  costValue: {
    fontFamily: theme.fontFamily.display,
    fontSize: 25,
    color: theme.colors.green,
  },
  perPersonValue: {
    fontFamily: theme.fontFamily.bodyBold,
    fontSize: 16,
    color: theme.colors.navy,
  },
  infoCard: {
    backgroundColor: theme.colors.navyDim,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.lg,
    flexDirection: "row",
    gap: theme.spacing.md,
  },
  infoIcon: {
    fontSize: 22,
  },
  infoTextWrap: {
    flex: 1,
  },
  infoTitle: {
    fontFamily: theme.fontFamily.bodyBold,
    fontSize: 13,
    color: theme.colors.navy,
    marginBottom: 2,
  },
  infoText: {
    fontFamily: theme.fontFamily.body,
    fontSize: 11,
    lineHeight: 17,
    color: theme.colors.textMuted,
  },
  sectionLabel: {
    marginTop: theme.spacing.md,
    marginBottom: theme.spacing.sm,
    color: theme.colors.textMuted,
  },
  ingredientsCard: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.lg,
    paddingHorizontal: theme.spacing.md,
  },
  ingredientItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.md,
    paddingVertical: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  ingredientEmoji: {
    fontSize: 22,
    width: 30,
  },
  ingredientInfo: {
    flex: 1,
  },
  ingredientName: {
    fontFamily: theme.fontFamily.bodyBold,
    fontSize: 14,
    color: theme.colors.navy,
  },
  ingredientAmount: {
    fontFamily: theme.fontFamily.body,
    fontSize: 12,
    color: theme.colors.textMuted,
    marginTop: 2,
  },
  unitPill: {
    minWidth: 58,
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: theme.radius.sm,
    borderWidth: 1.5,
    borderColor: theme.colors.borderOrange,
    backgroundColor: theme.colors.orangeDim,
    alignItems: "center",
  },
  unitPillText: {
    fontFamily: theme.fontFamily.bodyBold,
    fontSize: 10,
    color: theme.colors.orange,
  },
  stepsCard: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.lg,
  },
  stepItem: {
    flexDirection: "row",
    gap: theme.spacing.md,
    marginBottom: theme.spacing.lg,
  },
  stepNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: theme.colors.orangeDim,
    borderWidth: 1.5,
    borderColor: theme.colors.orange,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },
  stepNumberText: {
    fontFamily: theme.fontFamily.bodyBold,
    fontSize: 12,
    color: theme.colors.orange,
  },
  stepText: {
    flex: 1,
    fontFamily: theme.fontFamily.body,
    fontSize: 13,
    lineHeight: 21,
    color: theme.colors.textMedium,
  },
  toolSection: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.lg,
    paddingHorizontal: theme.spacing.md,
  },
  toolItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.md,
    paddingVertical: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  toolEmoji: {
    fontSize: 24,
  },
  toolInfo: {
    flex: 1,
  },
  toolName: {
    fontFamily: theme.fontFamily.bodyBold,
    fontSize: 13,
    color: theme.colors.navy,
  },
  toolPrice: {
    fontFamily: theme.fontFamily.body,
    fontSize: 11,
    color: theme.colors.textMuted,
    marginTop: 2,
  },
  toolAddButton: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: theme.radius.sm,
    backgroundColor: theme.colors.orangeDim,
    borderWidth: 1.5,
    borderColor: theme.colors.orange,
  },
  toolAddText: {
    fontFamily: theme.fontFamily.bodyBold,
    fontSize: 11,
    color: theme.colors.orange,
  },
  ctaBar: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 20,
    paddingTop: theme.spacing.md,
    paddingBottom: 28,
    backgroundColor: theme.colors.cream,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    flexDirection: "row",
    gap: theme.spacing.md,
  },
  totalBadge: {
    minWidth: 104,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.surface,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    paddingHorizontal: theme.spacing.md,
    justifyContent: "center",
  },
  totalLabel: {
    fontFamily: theme.fontFamily.bodyBold,
    fontSize: 9,
    color: theme.colors.textMuted,
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  totalValue: {
    fontFamily: theme.fontFamily.display,
    fontSize: 18,
    color: theme.colors.green,
  },
  ctaButton: {
    flex: 1,
  },
  pressed: {
    opacity: 0.8,
    transform: [{ scale: 0.97 }],
  },
  deco: {
    position: "absolute",
    opacity: 0.1,
  },
  decoLeaf: {
    top: 82,
    left: 24,
    fontSize: 38,
    transform: [{ rotate: "-16deg" }],
  },
  decoPepper: {
    top: 110,
    right: 28,
    fontSize: 34,
    transform: [{ rotate: "20deg" }],
  },
});
