// app/recipes/[id].tsx

import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import { router, useLocalSearchParams } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { ServingSizeControl } from "../../src/components/recipe/ServingSizeControl";
import { AppText } from "../../src/components/ui/AppText";
import { Button } from "../../src/components/ui/Button";
import { Screen } from "../../src/components/ui/Screen";
import {
  deleteFavoriteRecipe,
  insertFavoriteRecipe,
} from "../../src/db/favoritesRepository";
import { insertShoppingListItems } from "../../src/db/shoppingListRepository";
import {
  useAddFavoriteMutation,
  useRemoveFavoriteMutation,
} from "../../src/hooks/api/useFavorites";
import { useRecipeDetailWithLocalFallback } from "../../src/hooks/api/useRecipes";
import { useAddShoppingListItemMutation } from "../../src/hooks/api/useShoppingList";
import { apiRecipeToLocalRecipe } from "../../src/lib/api/adapters";
import { getApiErrorMessage } from "../../src/lib/api/errors";
import { formatNaira } from "../../src/lib/formatters";
import {
  createInitialIngredientUnitSelections,
  getNextUnitMode,
  getUnitModeLabel,
} from "../../src/lib/ingredientUnits";
import { scaleAmountText } from "../../src/lib/scaling";
import {
  generateShoppingListItemsFromRecipe,
  isPurchasableRecipeIngredient,
} from "../../src/lib/shoppingListGenerator";
import { capitalizeWords } from "../../src/lib/textFormatters";
import { useFavoritesStore } from "../../src/store/favoritesStore";
import { usePreferencesStore } from "../../src/store/preferencesStore";
import { useShoppingListStore } from "../../src/store/shoppingListStore";
import { theme } from "../../src/theme/theme";

export default function RecipeDetailScreen() {
  const db = useSQLiteContext();
  const { id } = useLocalSearchParams<{ id: string }>();

  const recipeQuery = useRecipeDetailWithLocalFallback(id);
  const recipeDetail = recipeQuery.data;
  const shouldSyncApi = recipeQuery.source === "api" && Boolean(recipeDetail);
  const recipe = recipeDetail
    ? apiRecipeToLocalRecipe(recipeDetail)
    : undefined;
  const addFavoriteMutation = useAddFavoriteMutation();
  const removeFavoriteMutation = useRemoveFavoriteMutation();
  const addShoppingListItemMutation = useAddShoppingListItemMutation();

  const defaultServingSize = usePreferencesStore(
    (state) => state.defaultServingSize
  );
  const defaultUnitMode = usePreferencesStore((state) => state.defaultUnitMode);
  const hapticsEnabled = usePreferencesStore((state) => state.hapticsEnabled);

  const addItems = useShoppingListStore((state) => state.addItems);

  const [servings, setServings] = useState(defaultServingSize);

  const localIsFavorite = useFavoritesStore((state) =>
    recipe ? state.isFavorite(recipe.id) : false
  );
  const isFavorite = recipeDetail?.isFavorited ?? localIsFavorite;
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

  async function handleFavoritePress() {
    if (!recipe) return;

    if (hapticsEnabled) {
      Haptics.selectionAsync();
    }

    const nextIsFavorite = toggleFavorite(recipe.id);

    try {
      if (shouldSyncApi && recipeDetail) {
        if (recipeDetail.isFavorited) {
          await removeFavoriteMutation.mutateAsync(recipeDetail.id);
        } else {
          await addFavoriteMutation.mutateAsync(recipeDetail.id);
        }
      }

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
      const apiIngredient = recipeDetail?.ingredients.find(
        (ingredient) => ingredient.id === ingredientId
      );

      if (apiIngredient && apiIngredient.availableUnits.length > 1) {
        const currentIndex = Number(current[ingredientId] ?? 0);

        return {
          ...current,
          [ingredientId]: String(
            (currentIndex + 1) % apiIngredient.availableUnits.length
          ) as never,
        };
      }

      const currentUnit = current[ingredientId] ?? defaultUnitMode;
      const nextUnit =
        currentUnit === "metric" ||
        currentUnit === "cups" ||
        currentUnit === "imperial"
          ? getNextUnitMode(currentUnit)
          : defaultUnitMode;

      return {
        ...current,
        [ingredientId]: nextUnit,
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

    if (shouldSyncApi && recipeDetail) {
      try {
        await Promise.all(
          recipeDetail.ingredients
            .filter(isPurchasableRecipeIngredient)
            .map((ingredient) => {
              const selectedIndex = Number(
                ingredientUnitSelections[ingredient.id] ?? 0
              );
              const selectedUnit =
                ingredient.availableUnits[selectedIndex] ??
                ingredient.availableUnits[0];

              return addShoppingListItemMutation.mutateAsync({
                recipeId: recipeDetail.id,
                name:
                  ingredient.ingredientName ??
                  ingredient.canonicalIngredientName ??
                  ingredient.rawText,
                canonicalIngredientName: ingredient.canonicalIngredientName,
                emoji: null,
                quantity:
                  selectedUnit?.label ??
                  ingredient.displayText ??
                  ingredient.quantityText ??
                  ingredient.rawText,
                unit: selectedUnit?.unit ?? ingredient.unit,
                category: ingredient.category,
                estimatedPrice: null,
              });
            })
        );
      } catch (error) {
        console.error("Failed to sync shopping list items", error);
      }
    }

    try {
      // TODO: reconcile backend shopping list writes into the offline sync queue.
      addItems(items);
      await insertShoppingListItems(db, items);
    } catch (error) {
      console.error("Failed to persist shopping list items", error);
    }

    if (hapticsEnabled) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }

    router.push("/(tabs)/shopping");
  }

  if (recipeQuery.isLoading && !recipe) {
    return (
      <Screen>
        <View style={styles.center}>
          <AppText variant="title">Loading recipe...</AppText>
        </View>
      </Screen>
    );
  }

  if (recipeQuery.isError && !recipe) {
    return (
      <Screen>
        <View style={styles.center}>
          <AppText variant="title">Could not load recipe</AppText>
          <AppText style={styles.errorText}>
            {getApiErrorMessage(recipeQuery.error)}
          </AppText>
          <Button title="Try again" onPress={() => recipeQuery.refetch()} />
        </View>
      </Screen>
    );
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

          {recipe.imageUrl ? (
            <Image
              source={{ uri: recipe.imageUrl }}
              style={styles.heroImage}
              contentFit="cover"
              transition={150}
            />
          ) : (
            <AppText style={styles.heroEmoji}>{recipe.emoji ?? "🍲"}</AppText>
          )}
          <View style={styles.heroImageOverlay} />

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
              {recipe.calories !== null ? (
                <AppText style={styles.stat}>🔥 {recipe.calories} kcal</AppText>
              ) : null}
              <AppText style={styles.stat}>👨‍🍳 {recipe.difficulty}</AppText>
            </View>
          </View>
        </View>

        <View style={styles.body}>
          {/*
            Estimated cost is hidden until backend price data is reliable.
            Keep the old UI out of production for now.
          */}

          <SectionHeader title="Ingredients" />

          <View style={styles.ingredientsCard}>
            {recipe.ingredients.map((ingredient) => {
              const apiIngredient = recipeDetail?.ingredients.find(
                (item) => item.id === ingredient.id
              );

              if (apiIngredient) {
                const selectedIndex = Number(
                  ingredientUnitSelections[ingredient.id] ?? 0
                );
                const selectedUnit =
                  apiIngredient.availableUnits[selectedIndex] ??
                  apiIngredient.availableUnits[0];
                const displayAmount =
                  selectedUnit?.label ??
                  apiIngredient.displayText ??
                  apiIngredient.rawText;

                return (
                  <View key={ingredient.id} style={styles.ingredientItem}>
                    <AppText style={styles.ingredientEmoji}>🛒</AppText>

                    <View style={styles.ingredientInfo}>
                      <AppText style={styles.ingredientName}>
                        {capitalizeWords(ingredient.name)}
                      </AppText>
                    </View>

                    <View style={styles.ingredientMeasure}>
                      <AppText style={styles.ingredientAmount}>
                        {displayAmount}
                      </AppText>
                    </View>
                  </View>
                );
              }

              const selectedUnitMode =
                ingredientUnitSelections[ingredient.id] ?? defaultUnitMode;

              const originalAmount =
                selectedUnitMode === "metric" ||
                selectedUnitMode === "cups" ||
                selectedUnitMode === "imperial"
                  ? ingredient.amount[selectedUnitMode]
                  : ingredient.availableUnits?.[Number(selectedUnitMode)]
                      ?.label ?? ingredient.amount[defaultUnitMode];

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
                      {capitalizeWords(ingredient.name)}
                    </AppText>
                  </View>

                  <View style={styles.ingredientMeasure}>
                    <AppText style={styles.ingredientAmount}>
                      {scaledAmount}
                    </AppText>

                    <Pressable
                      onPress={() => handleIngredientUnitPress(ingredient.id)}
                      style={({ pressed }) => [
                        styles.unitPill,
                        pressed && styles.pressed,
                      ]}
                    >
                      <AppText style={styles.unitPillText}>
                        {selectedUnitMode === "metric" ||
                        selectedUnitMode === "cups" ||
                        selectedUnitMode === "imperial"
                          ? getUnitModeLabel(selectedUnitMode)
                          : "unit"}
                      </AppText>
                    </Pressable>
                  </View>
                </View>
              );
            })}
          </View>

          {recipeDetail && !recipeDetail.baseServings ? null : (
            <>
              <SectionHeader title="Serving Size" />
              <ServingSizeControl value={servings} onChange={setServings} />
            </>
          )}

          <SectionHeader title="Instructions" />

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
              <SectionHeader title="Helpful Tools" />

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
        <Button
          title="🛒 Add to Shopping List"
          variant="primary"
          onPress={handleAddToShoppingList}
          style={styles.ctaButton}
        />
      </View>
    </View>
  );
}

function SectionHeader({ title }: { title: string }) {
  return (
    <View style={styles.sectionHeader}>
      <AppText style={styles.sectionTitle}>{title}</AppText>
      <View style={styles.sectionRule} />
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
  errorText: {
    color: theme.colors.red,
    textAlign: "center",
    paddingHorizontal: theme.spacing.xl,
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
  heroImage: {
    ...StyleSheet.absoluteFillObject,
  },
  heroImageOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(12,33,48,0.42)",
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
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.md,
    marginTop: 14,
    marginBottom: theme.spacing.sm,
  },
  sectionTitle: {
    fontFamily: theme.fontFamily.bodyBold,
    fontSize: 12,
    color: theme.colors.textMuted,
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  sectionRule: {
    flex: 1,
    height: 1,
    backgroundColor: theme.colors.border,
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
    minWidth: 0,
  },
  ingredientName: {
    fontFamily: theme.fontFamily.bodyMedium,
    fontSize: 13,
    color: theme.colors.text,
  },
  ingredientMeasure: {
    maxWidth: "48%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: theme.spacing.sm,
    // color: theme.colors.navy,
  },
  ingredientAmount: {
    flexShrink: 1,
    fontFamily: theme.fontFamily.bodyBold,
    fontSize: 13,
    // color: theme.colors.textMedium,
    color: theme.colors.navy,
    textAlign: "right",
  },
  unitPill: {
    minWidth: 36,
    paddingHorizontal: 8,
    paddingVertical: 5,
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
    backgroundColor: theme.colors.navy,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },
  stepNumberText: {
    fontFamily: theme.fontFamily.bodyBold,
    fontSize: 12,
    color: theme.colors.white,
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
