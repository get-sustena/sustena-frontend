// app/recipes/[id].tsx

import * as Haptics from "expo-haptics";
import { router, useLocalSearchParams } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { useMemo, useState } from "react";
import { LinearGradient } from "expo-linear-gradient";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { RecipePhoto } from "../../src/components/recipe/RecipePhoto";
import { AppText } from "../../src/components/ui/AppText";
import { Button } from "../../src/components/ui/Button";
import { Icon } from "../../src/components/ui/Icon";
import { InlineNotice } from "../../src/components/ui/InlineNotice";
import { ProgressLoader } from "../../src/components/ui/ProgressLoader";
import { Screen } from "../../src/components/ui/Screen";
import {
  deleteFavoriteRecipe,
  insertFavoriteRecipe,
} from "../../src/db/favoritesRepository";
import { insertShoppingListItems } from "../../src/db/shoppingListRepository";
import { enqueueSyncOperation } from "../../src/db/syncQueueRepository";
import {
  useAddFavoriteMutation,
  useRemoveFavoriteMutation,
} from "../../src/hooks/api/useFavorites";
import { useIngredientCatalogQuery } from "../../src/hooks/api/useIngredients";
import { useRecipeDetailWithLocalFallback } from "../../src/hooks/api/useRecipes";
import { useAddShoppingListItemMutation } from "../../src/hooks/api/useShoppingList";
import { useUnitsQuery } from "../../src/hooks/api/useUnits";
import {
  apiRecipeToLocalRecipe,
  apiShoppingItemToLocalItem,
} from "../../src/lib/api/adapters";
import { getApiErrorMessage } from "../../src/lib/api/errors";
import { formatNaira } from "../../src/lib/formatters";
import {
  createInitialIngredientUnitSelections,
} from "../../src/lib/ingredientUnits";
import { formatScaledInstruction } from "../../src/lib/instructionScaling";
import { scaleAmountText, scaleCost } from "../../src/lib/scaling";
import {
  generateShoppingListItemsFromRecipe,
  isPurchasableRecipeIngredient,
} from "../../src/lib/shoppingListGenerator";
import { capitalizeWords } from "../../src/lib/textFormatters";
import {
  buildScaleUnitOptions,
  buildIngredientLookup,
  buildUnitLookup,
  convertIngredientQuantity,
  getIngredientConversionContext,
  getUnitModeForUnitId,
  isSelectableIngredientUnit,
  UnitMode,
} from "../../src/lib/unitConversion";
import { useFavoritesStore } from "../../src/store/favoritesStore";
import { usePreferencesStore } from "../../src/store/preferencesStore";
import { useShoppingListStore } from "../../src/store/shoppingListStore";
import { closeSheet, openSheet } from "../../src/store/uiStore";
import { theme } from "../../src/theme/theme";
import type {
  RecipeDetail as ApiRecipeDetail,
  RecipeIngredient as ApiRecipeIngredient,
} from "../../src/types/api";
import { DEFAULT_SHOPPING_LIST_ID } from "../../src/types/shoppingList";

export default function RecipeDetailScreen() {
  const db = useSQLiteContext();
  const insets = useSafeAreaInsets();
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
  const [globalUnitMode, setGlobalUnitMode] =
    useState<UnitMode>(defaultUnitMode);

  const localIsFavorite = useFavoritesStore((state) =>
    recipe ? state.isFavorite(recipe.id) : false
  );
  const [favoriteOverride, setFavoriteOverride] = useState<boolean | null>(null);
  const isFavorite =
    favoriteOverride ?? recipeDetail?.isFavorited ?? localIsFavorite;
  const addFavoriteLocal = useFavoritesStore((state) => state.addFavorite);
  const removeFavoriteLocal = useFavoritesStore(
    (state) => state.removeFavorite
  );

  const [ingredientUnitSelections, setIngredientUnitSelections] = useState(
    () => {
      if (!recipe) return {};

      return createInitialIngredientUnitSelections({
        recipe,
        defaultUnitMode,
      });
    }
  );

  const unitsQuery = useUnitsQuery();
  const ingredientCatalogQuery = useIngredientCatalogQuery();
  const unitsById = useMemo(
    () => buildUnitLookup(unitsQuery.data ?? []),
    [unitsQuery.data]
  );
  const ingredientsById = useMemo(
    () => buildIngredientLookup(ingredientCatalogQuery.data ?? []),
    [ingredientCatalogQuery.data]
  );
  const canConvertUnits = unitsById.size > 0;
  const unitCatalog = unitsQuery.data ?? [];

  function getApiIngredientOptions(apiIngredient: ApiRecipeIngredient) {
    const ingredientContext = getIngredientConversionContext(
      apiIngredient.ingredientId
        ? ingredientsById.get(apiIngredient.ingredientId)
        : undefined
    );
    const storedQuantity =
      apiIngredient.quantity !== null && apiIngredient.quantity !== undefined
        ? Number(apiIngredient.quantity)
        : null;
    const baseServings =
      Number.isFinite(recipe?.baseServings) && (recipe?.baseServings ?? 0) > 0
        ? recipe!.baseServings
        : 1;
    const servingFactor = servings / baseServings;
    const modesToTry: UnitMode[] =
      globalUnitMode === "cups" ? ["cups", "metric"] : [globalUnitMode];
    let effectiveMode = globalUnitMode;
    let scaleOptions: IngredientUnitOption[] = [];

    if (
      canConvertUnits &&
      storedQuantity !== null &&
      Number.isFinite(storedQuantity) &&
      apiIngredient.unit
    ) {
      for (const mode of modesToTry) {
        scaleOptions = buildScaleUnitOptions({
          units: unitCatalog,
          quantity: storedQuantity,
          fromUnit: apiIngredient.unit,
          context: ingredientContext,
          mode,
          servingFactor,
        }).map((option) => ({
          value: option.unit,
          unit: option.unit,
          label: option.label,
          preview: option.preview,
        }));

        if (scaleOptions.length > 0) {
          effectiveMode = mode;
          break;
        }
      }
    }

    if (scaleOptions.length > 0) {
      return {
        options: scaleOptions,
        ingredientContext,
        storedQuantity,
        effectiveMode,
      };
    }

    let availableOptions: IngredientUnitOption[] = [];

    for (const mode of modesToTry) {
      availableOptions = apiIngredient.availableUnits
        .map((unit, unitIndex) => ({ unit, unitIndex }))
        .filter(
          ({ unit }) =>
            isSelectableIngredientUnit(unit.unit) &&
            getUnitModeForUnitId(unit.unit) === mode
        )
        .map(({ unit, unitIndex }) => ({
          value: `available:${unitIndex}`,
          unit: unit.unit,
          label: getAvailableUnitName(unit.unit, unitIndex),
          preview: scaleAmountText({
            amount: unit.label,
            baseServings,
            selectedServings: servings,
          }),
        }));

      if (availableOptions.length > 0) {
        effectiveMode = mode;
        break;
      }
    }

    return {
      options: availableOptions,
      ingredientContext,
      storedQuantity,
      effectiveMode,
    };
  }

  function getSelectedApiIngredientOption(apiIngredient: ApiRecipeIngredient) {
    const { options, ingredientContext, storedQuantity, effectiveMode } =
      getApiIngredientOptions(apiIngredient);
    const rawSelection =
      ingredientUnitSelections[apiIngredient.id] ?? globalUnitMode;
    let selectedValue = String(rawSelection);

    if (
      isUnitMode(rawSelection) &&
      storedQuantity !== null &&
      apiIngredient.unit
    ) {
      const baseServings =
        Number.isFinite(recipe?.baseServings) && (recipe?.baseServings ?? 0) > 0
          ? recipe!.baseServings
          : 1;
      const preferred = convertIngredientQuantity({
        unitsById,
        quantity: storedQuantity * (servings / baseServings),
        fromUnit: apiIngredient.unit,
        context: ingredientContext,
        mode: rawSelection === "cups" ? effectiveMode : rawSelection,
      });

      if (preferred) {
        const preferredUnit = unitsById.get(preferred.unit);
        const equivalentOption = preferredUnit
          ? options.find((option) => {
              if (!option.unit) return false;
              const optionUnit = unitsById.get(option.unit);

              return (
                optionUnit?.baseUnit === preferredUnit.baseUnit &&
                Number(optionUnit.baseFactorMin) ===
                  Number(preferredUnit.baseFactorMin) &&
                Number(optionUnit.baseFactorMax) ===
                  Number(preferredUnit.baseFactorMax)
              );
            })
          : undefined;

        selectedValue = equivalentOption?.value ?? preferred.unit;
      }
    }

    const selectedOption =
      options.find((option) => option.value === selectedValue) ??
      options.find((option) => option.unit === apiIngredient.unit) ??
      options[0];

    return {
      options,
      selectedOption,
      selectedValue: selectedOption?.value ?? "",
    };
  }

  const scaledCost = recipe
    ? scaleCost({
        baseCost: recipe.cost,
        baseServings: recipe.baseServings,
        selectedServings: servings,
      })
    : null;
  const costPerPerson =
    scaledCost !== null && servings > 0
      ? Math.round(scaledCost / servings)
      : null;
  const selectedInstructionUnits = new Map(
    (recipeDetail?.ingredients ?? []).flatMap((ingredient) => {
      const selectedUnit =
        getSelectedApiIngredientOption(ingredient).selectedOption?.unit;

      return selectedUnit ? [[ingredient.id, selectedUnit] as const] : [];
    })
  );
  const instructions = [...(recipeDetail?.instructions ?? [])]
    .sort((left, right) => left.stepNumber - right.stepNumber)
    .map((instruction) => ({
      ...instruction,
      displayText: formatScaledInstruction({
        instruction,
        baseServings: recipeDetail?.baseServings ?? null,
        selectedServings: servings,
        unitsById,
        selectedUnitByIngredientId: selectedInstructionUnits,
      }),
    }));
  const displayTags = getRecipeDetailTags(recipeDetail, recipe?.tags ?? []);

  async function handleFavoritePress() {
    if (!recipe) return;

    if (hapticsEnabled) {
      Haptics.selectionAsync();
    }

    const nextIsFavorite = !isFavorite;
    setFavoriteOverride(nextIsFavorite);

    if (nextIsFavorite) {
      addFavoriteLocal(recipe.id);
    } else {
      removeFavoriteLocal(recipe.id);
    }

    // Local-first: the favorite state persists locally no matter what,
    // then we best-effort sync it and queue a retry if that sync fails.
    const localWrite = nextIsFavorite
      ? insertFavoriteRecipe(db, recipe.id)
      : deleteFavoriteRecipe(db, recipe.id);

    await localWrite.catch((error) => {
      console.error("Failed to persist favorite locally", error);
    });

    if (!shouldSyncApi || !recipeDetail) {
      return;
    }

    try {
      if (nextIsFavorite) {
        await addFavoriteMutation.mutateAsync(recipeDetail.id);
      } else {
        await removeFavoriteMutation.mutateAsync(recipeDetail.id);
      }
    } catch (error) {
      console.error("Failed to sync favorite, queuing for retry", error);
      await enqueueSyncOperation(
        db,
        nextIsFavorite ? "favorite_add" : "favorite_remove",
        { recipeId: recipeDetail.id }
      ).catch((queueError) => {
        console.error("Failed to queue favorite sync", queueError);
      });
    }
  }

  function selectGlobalUnitMode(mode: UnitMode) {
    if (!recipe) return;

    if (hapticsEnabled) {
      Haptics.selectionAsync();
    }

    setGlobalUnitMode(mode);
    setIngredientUnitSelections(
      recipe.ingredients.reduce<Record<string, string>>((next, ingredient) => {
        next[ingredient.id] = mode;
        return next;
      }, {})
    );
  }

  function openIngredientUnitSheet(
    ingredientId: string,
    ingredientName: string,
    options: IngredientUnitOption[],
    selectedValue: string
  ) {
    if (options.length === 0) {
      return;
    }

    if (hapticsEnabled) {
      Haptics.selectionAsync();
    }

    openSheet(
      <IngredientUnitSheet
        ingredientName={ingredientName}
        options={options}
        selectedValue={selectedValue}
        onSelect={(value) => {
          setIngredientUnitSelections((current) => ({
            ...current,
            [ingredientId]: value,
          }));
          closeSheet();
        }}
      />
    );
  }

  async function handleAddToShoppingList() {
    if (!recipe) return;

    const ingredientAmountOverrides = recipeDetail
      ? Object.fromEntries(
          recipeDetail.ingredients.map((ingredient) => [
            ingredient.id,
            getSelectedApiIngredientOption(ingredient).selectedOption
              ?.preview ??
              scaleAmountText({
                amount:
                  ingredient.displayText ??
                  ingredient.quantityText ??
                  ingredient.rawText,
                baseServings: recipe.baseServings,
                selectedServings: servings,
              }),
          ])
        )
      : undefined;
    const items = generateShoppingListItemsFromRecipe({
      recipe,
      selectedServings: servings,
      ingredientUnitSelections,
      ingredientAmountOverrides,
    });

    let itemsToPersist = items;

    if (shouldSyncApi && recipeDetail) {
      const apiIngredients = recipeDetail.ingredients.filter(
        isPurchasableRecipeIngredient
      );
      const itemPayloads = apiIngredients.map((ingredient) => {
        const selectedUnit = getSelectedApiIngredientOption(
          ingredient
        ).selectedOption;

        return {
          recipeId: recipeDetail.id,
          name:
            ingredient.ingredientName ??
            ingredient.canonicalIngredientName ??
            ingredient.rawText,
          canonicalIngredientName: ingredient.canonicalIngredientName,
          emoji: null,
          quantity:
            selectedUnit?.preview ??
            ingredient.displayText ??
            ingredient.quantityText ??
            ingredient.rawText,
          unit: selectedUnit?.unit ?? ingredient.unit,
          category: ingredient.category,
          estimatedPrice: null,
        };
      });

      const results = await Promise.allSettled(
        itemPayloads.map((payload) =>
          addShoppingListItemMutation.mutateAsync(payload)
        )
      );

      itemsToPersist = results.map((result, index) =>
        result.status === "fulfilled"
          ? apiShoppingItemToLocalItem(result.value)
          : items[index]
      );

      const rejectedResults = results
        .map((result, index) => ({ result, payload: itemPayloads[index] }))
        .filter(
          (entry): entry is { result: PromiseRejectedResult; payload: typeof itemPayloads[number] } =>
            entry.result.status === "rejected"
        );

      if (rejectedResults.length > 0) {
        console.error(
          "Failed to sync shopping list items, queuing for retry",
          rejectedResults[0].result.reason
        );

        await Promise.all(
          rejectedResults.map((entry) =>
            enqueueSyncOperation(db, "shopping_add", entry.payload).catch(
              (queueError) => {
                console.error("Failed to queue shopping item sync", queueError);
              }
            )
          )
        );
      }
    }

    try {
      addItems(itemsToPersist);
      await insertShoppingListItems(db, itemsToPersist);
    } catch (error) {
      console.error("Failed to persist shopping list items", error);
    }

    if (hapticsEnabled) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }

    router.push({
      pathname: "/shopping/[id]",
      params: { id: DEFAULT_SHOPPING_LIST_ID },
    });
  }

  if (recipeQuery.isLoading && !recipe) {
    return <ProgressLoader variant="screen" message="Loading recipe..." />;
  }

  if (recipeQuery.isError && !recipe) {
    return (
      <Screen>
        <View style={styles.center}>
          <AppText variant="title">Could not load recipe</AppText>
          <View style={styles.errorNotice}>
            <InlineNotice
              tone="error"
              message={getApiErrorMessage(recipeQuery.error)}
            />
          </View>
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
      <View style={styles.headerBlock}>
        <RecipePhoto
          imageUrl={recipe.imageUrl}
          fallbackLabel="recipe photo"
          style={styles.photo}
        />

        <View
          style={[
            styles.photoButtons,
            { top: Math.max(52, insets.top + 5) },
          ]}
        >
          <Pressable onPress={() => router.back()} style={styles.roundButton}>
            <Icon name="chevronLeft" size={20} color={theme.colors.text} />
          </Pressable>

          <Pressable
            onPress={handleFavoritePress}
            style={[
              styles.roundButton,
              isFavorite && styles.favoriteButtonActive,
            ]}
          >
            <Icon
              name="bookmark"
              size={22}
              color={isFavorite ? theme.colors.onDark : theme.colors.text}
              filled={isFavorite}
            />
          </Pressable>
        </View>

      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        automaticallyAdjustContentInsets={false}
        contentInsetAdjustmentBehavior="never"
      >
        <View style={styles.titleBlock}>
          <View style={styles.tagRow}>
            {displayTags.map((tag) => (
              <View key={tag} style={styles.tag}>
                <AppText style={styles.tagText}>{tag}</AppText>
              </View>
            ))}
          </View>

          <AppText style={styles.heroTitle}>{recipe.name}</AppText>

          <View style={styles.statsCard}>
            <StatCell
              icon="timer"
              value={recipe.time}
              label="Time"
              borderRight
            />
            <StatCell
              icon="chefHat"
              value={recipe.difficulty}
              label="Level"
            />
          </View>
        </View>

        <View style={styles.body}>
          {recipeDetail && !recipeDetail.baseServings ? null : (
            <>
              <SectionHeader title="Serving Size" />
              <View style={styles.servingCard}>
                <Pressable
                  onPress={() => setServings((current) => Math.max(1, current - 1))}
                  style={styles.servingButton}
                >
                  <Icon name="minus" size={20} color={theme.colors.text} />
                </Pressable>

                <View style={styles.servingValueWrap}>
                  <AppText style={styles.servingValue}>{servings}</AppText>
                  <AppText style={styles.servingLabel}>
                    {servings === 1 ? "person" : "people"}
                  </AppText>
                </View>

                <Pressable
                  onPress={() =>
                    setServings((current) => Math.min(25, current + 1))
                  }
                  style={styles.servingButton}
                >
                  <Icon name="plus" size={20} color={theme.colors.text} />
                </Pressable>
              </View>
            </>
          )}

          <SectionHeader title="Default Units" />
          <View style={styles.unitModeRow}>
            {[
              { value: "metric" as const, label: "Metric" },
              { value: "imperial" as const, label: "Imperial" },
              { value: "cups" as const, label: "Nigerian Units" },
            ].map((option) => {
              const selected = globalUnitMode === option.value;

              return (
                <Pressable
                  key={option.value}
                  onPress={() => selectGlobalUnitMode(option.value)}
                  style={({ pressed }) => [
                    styles.unitModeButton,
                    selected && styles.unitModeButtonSelected,
                    pressed && styles.pressed,
                  ]}
                >
                  <AppText
                    numberOfLines={1}
                    adjustsFontSizeToFit
                    minimumFontScale={0.82}
                    style={[
                      styles.unitModeButtonText,
                      selected && styles.unitModeButtonTextSelected,
                    ]}
                  >
                    {option.label}
                  </AppText>
                </Pressable>
              );
            })}
          </View>

          <SectionHeader title="Ingredients" />

          <View style={styles.ingredientsCard}>
            {recipe.ingredients.map((ingredient, index) => {
              const isLast = index === recipe.ingredients.length - 1;
              const apiIngredient = recipeDetail?.ingredients.find(
                (item) => item.id === ingredient.id
              );

              if (apiIngredient) {
                const {
                  options: unitOptions,
                  selectedOption,
                  selectedValue,
                } = getSelectedApiIngredientOption(apiIngredient);
                const displayAmount =
                  selectedOption?.preview ??
                  scaleAmountText({
                    amount: getIngredientQuantityUnitLabel({
                      quantity: apiIngredient.quantity,
                      unit: apiIngredient.unit,
                      fallback:
                        apiIngredient.displayText ?? apiIngredient.rawText,
                    }),
                    baseServings: recipe.baseServings,
                    selectedServings: servings,
                  });

                return (
                  <View
                    key={ingredient.id}
                    style={[
                      styles.ingredientItem,
                      !isLast && styles.ingredientItemDivider,
                    ]}
                  >
                    <AppText style={styles.ingredientName}>
                      {capitalizeWords(ingredient.name)}
                    </AppText>

                    {unitOptions.length > 0 ? (
                      <Pressable
                        onPress={() =>
                          openIngredientUnitSheet(
                            ingredient.id,
                            ingredient.name,
                            unitOptions,
                            selectedValue
                          )
                        }
                        style={({ pressed }) => [
                          styles.ingredientChip,
                          pressed && styles.pressed,
                        ]}
                      >
                        <AppText
                          numberOfLines={1}
                          style={styles.ingredientChipText}
                        >
                          {displayAmount}
                        </AppText>
                        <Icon
                          name="chevronDown"
                          size={11}
                          color={theme.colors.textMuted}
                        />
                      </Pressable>
                    ) : (
                      <AppText
                        numberOfLines={1}
                        style={styles.ingredientPlainAmount}
                      >
                        {displayAmount}
                      </AppText>
                    )}
                  </View>
                );
              }

              const selectedUnitMode =
                ingredientUnitSelections[ingredient.id] ?? globalUnitMode;
              const modeCandidates: UnitMode[] =
                globalUnitMode === "cups"
                  ? ["cups", "metric"]
                  : [globalUnitMode];
              const availableUnitsWithIndexes =
                ingredient.availableUnits?.map((unit, unitIndex) => ({
                  unit,
                  unitIndex,
                })) ?? [];
              const compatibleAvailableUnits =
                modeCandidates
                  .map((mode) =>
                    availableUnitsWithIndexes.filter(
                      ({ unit }) =>
                        isSelectableIngredientUnit(unit.unit) &&
                        getUnitModeForUnitId(unit.unit) === mode
                    )
                  )
                  .find((options) => options.length > 0) ?? [];
              const localUnitOptions: IngredientUnitOption[] =
                compatibleAvailableUnits.length > 0
                  ? compatibleAvailableUnits.map(({ unit, unitIndex }) => ({
                      value: String(unitIndex),
                      label: getAvailableUnitName(unit.unit, unitIndex),
                      preview: scaleAmountText({
                        amount: unit.label,
                        baseServings: recipe.baseServings,
                        selectedServings: servings,
                      }),
                    }))
                  : [
                      {
                        value: globalUnitMode,
                        label: getUnitModeName(globalUnitMode),
                        preview: scaleAmountText({
                          amount: ingredient.amount[globalUnitMode],
                          baseServings: recipe.baseServings,
                          selectedServings: servings,
                        }),
                      },
                    ];
              const selectedValue = localUnitOptions.some(
                (option) => option.value === selectedUnitMode
              )
                ? String(selectedUnitMode)
                : localUnitOptions[0]?.value ?? "";

              const originalAmount =
                selectedValue === "metric" ||
                selectedValue === "cups" ||
                selectedValue === "imperial"
                  ? ingredient.amount[selectedValue]
                  : ingredient.availableUnits?.[Number(selectedValue)]
                      ?.label ?? ingredient.amount[globalUnitMode];

              const scaledAmount = scaleAmountText({
                amount: originalAmount,
                baseServings: recipe.baseServings,
                selectedServings: servings,
              });

              return (
                <View
                  key={ingredient.id}
                  style={[
                    styles.ingredientItem,
                    !isLast && styles.ingredientItemDivider,
                  ]}
                >
                  <AppText style={styles.ingredientName}>
                    {capitalizeWords(ingredient.name)}
                  </AppText>

                  <Pressable
                    onPress={() =>
                      openIngredientUnitSheet(
                        ingredient.id,
                        ingredient.name,
                        localUnitOptions,
                        selectedValue
                      )
                    }
                    style={({ pressed }) => [
                      styles.ingredientChip,
                      pressed && styles.pressed,
                    ]}
                  >
                    <AppText
                      numberOfLines={1}
                      style={styles.ingredientChipText}
                    >
                      {scaledAmount}
                    </AppText>
                    <Icon
                      name="chevronDown"
                      size={11}
                      color={theme.colors.textMuted}
                    />
                  </Pressable>
                </View>
              );
            })}
          </View>

          {scaledCost !== null ? (
            <>
              <SectionHeader title="Estimated Cost" />
              <View style={styles.costRow}>
                <View style={styles.costMain}>
                  <AppText style={styles.costLabel}>Total Cost</AppText>
                  <AppText style={styles.costValue}>
                    {formatNaira(scaledCost)}
                  </AppText>
                </View>

                <View style={styles.costPer}>
                  <AppText style={styles.costLabel}>Per Person</AppText>
                  <AppText style={styles.costValueSecondary}>
                    {costPerPerson !== null ? formatNaira(costPerPerson) : "--"}
                  </AppText>
                </View>
              </View>
            </>
          ) : null}

          <SectionHeader title="Instructions" />

          <View style={styles.stepsCard}>
            <View style={styles.stepsLine} />

            {instructions.map((instruction) => (
              <View key={instruction.id} style={styles.stepItem}>
                <View style={styles.stepNumber}>
                  <AppText style={styles.stepNumberText}>
                    {instruction.stepNumber}
                  </AppText>
                </View>

                <AppText style={styles.stepText}>
                  {instruction.displayText}
                </AppText>
              </View>
            ))}
          </View>

          {recipe.tools.length > 0 ? (
            <>
              <SectionHeader title="Helpful Tools" />

              <View style={styles.toolSection}>
                <AppText style={styles.toolSectionTitle}>
                  Need This Tool?
                </AppText>

                {recipe.tools.map((tool, index) => (
                  <View
                    key={tool.id}
                    style={[
                      styles.toolItem,
                      index === recipe.tools.length - 1 &&
                        styles.toolItemLast,
                    ]}
                  >
                    <View style={styles.toolInfo}>
                      <AppText style={styles.toolName}>{tool.name}</AppText>
                      <AppText style={styles.toolPrice}>
                        {formatNaira(tool.price)} · GoLemon
                      </AppText>
                    </View>

                    <Pressable style={styles.toolAddButton}>
                      <AppText style={styles.toolAddText}>Add</AppText>
                    </Pressable>
                  </View>
                ))}
              </View>
            </>
          ) : null}
        </View>
      </ScrollView>

      <View
        style={[
          styles.ctaBar,
          { paddingBottom: Math.max(24, insets.bottom + 8) },
        ]}
      >
        <LinearGradient
          colors={["rgba(255,255,255,0)", "#FFFFFF", "#FFFFFF"]}
          locations={[0, 0.24, 1]}
          style={StyleSheet.absoluteFillObject}
        />

        {scaledCost !== null ? (
          <View style={styles.ctaCost}>
            <AppText style={styles.ctaCostLabel}>Total</AppText>
            <AppText style={styles.ctaCostValue}>
              {formatNaira(scaledCost)}
            </AppText>
          </View>
        ) : null}

        <Pressable
          onPress={handleAddToShoppingList}
          style={({ pressed }) => [
            styles.ctaButton,
            pressed && styles.pressed,
          ]}
        >
          <Icon name="shop" size={18} color={theme.colors.onDark} />
          <AppText style={styles.ctaButtonText}>Add to Shopping List</AppText>
        </Pressable>
      </View>
    </View>
  );
}

type IngredientUnitOption = {
  value: string;
  unit?: string | null;
  label: string;
  preview: string;
};

function IngredientUnitSheet({
  ingredientName,
  options,
  selectedValue,
  onSelect,
}: {
  ingredientName: string;
  options: IngredientUnitOption[];
  selectedValue: string;
  onSelect: (value: string) => void;
}) {
  return (
    <View style={styles.unitSheet}>
      <AppText style={styles.unitSheetEyebrow}>
        {capitalizeWords(ingredientName)}
      </AppText>
      <AppText style={styles.unitSheetTitle}>Choose a unit</AppText>

      <ScrollView
        style={styles.unitSheetOptions}
        contentContainerStyle={styles.unitSheetOptionsContent}
        showsVerticalScrollIndicator={options.length > 6}
        nestedScrollEnabled
      >
        {options.map((option, index) => {
          const selected = option.value === selectedValue;

          return (
            <Pressable
              key={option.value}
              onPress={() => onSelect(option.value)}
              style={[
                styles.unitSheetOption,
                index === options.length - 1 && styles.unitSheetOptionLast,
              ]}
            >
              <AppText
                style={[
                  styles.unitSheetOptionName,
                  selected && styles.unitSheetOptionNameSelected,
                ]}
              >
                {option.label}
              </AppText>
              <View style={styles.unitSheetOptionRight}>
                <AppText style={styles.unitSheetPreview}>
                  {option.preview}
                </AppText>
                {selected ? (
                  <Icon name="check" size={17} color={theme.colors.green} />
                ) : null}
              </View>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

function getUnitModeName(mode: UnitMode) {
  if (mode === "metric") return "Metric";
  if (mode === "imperial") return "Imperial";
  return "Nigerian Units";
}

function isUnitMode(value: string): value is UnitMode {
  return value === "metric" || value === "imperial" || value === "cups";
}

function getRecipeDetailTags(
  recipe: ApiRecipeDetail | undefined,
  fallbackTags: string[]
) {
  const candidates = [
    ...(recipe?.tags ?? fallbackTags),
    ...(recipe?.dietaryTags ?? []),
    ...(recipe?.cuisine ? [recipe.cuisine] : []),
  ].filter(Boolean);
  const uniqueCandidates = candidates.filter(
    (tag, index, tags) =>
      tags.findIndex(
        (candidate) => normalizeTag(candidate) === normalizeTag(tag)
      ) === index
  );
  const selected: string[] = [];

  const takeFirstMatching = (pattern: RegExp) => {
    const match = uniqueCandidates.find(
      (tag) =>
        !selected.includes(tag) && pattern.test(normalizeTag(tag))
    );

    if (match) {
      selected.push(match);
    }
  };

  takeFirstMatching(/\b(breakfast|brunch|lunch|dinner|snack)\b/);
  takeFirstMatching(
    /\b(low budget|budget|main dish|side dish|soup|stew|salad|dessert|drink|beverage|porridge|rice dish|pasta|swallow)\b/
  );
  takeFirstMatching(
    /\b(nigerian|west african|african|south east|south west|north east|north west|north central|yoruba|igbo|hausa|calabar|akwa ibom|delta|edo)\b/
  );

  return selected.slice(0, 3).map((tag) =>
    capitalizeWords(tag.replace(/_/g, " "))
  );
}

function normalizeTag(value: string) {
  return value.toLowerCase().replace(/[-_]+/g, " ").replace(/\s+/g, " ").trim();
}

function getAvailableUnitName(unit: string | null, index: number) {
  if (!unit) return `Option ${index + 1}`;

  const normalized = unit.toLowerCase();
  if (normalized === "metric_cup" || normalized === "flour_metric_cup") {
    return "Metric Cup";
  }
  if (normalized === "us_cup") return "U.S. Cup";
  if (normalized === "imperial_cup") return "Imperial Cup";
  if (normalized.includes("milk_cup")) return "Milk Cup";
  if (normalized.includes("derica_large")) return "Large Derica Cup";
  if (normalized.includes("derica")) return "Small Derica Cup";
  if (normalized.includes("congo")) return "Congo (Kongo)";
  if (normalized.includes("mudu")) return "Mudu";
  if (normalized.includes("floz")) return "Fluid Ounces";
  if (normalized.includes("ounce") || normalized.endsWith("_oz") || normalized === "oz") {
    return "Ounces";
  }
  if (normalized.includes("pound") || normalized.endsWith("_lb") || normalized === "lb") {
    return "Pounds";
  }
  if (normalized.includes("kilogram") || normalized.endsWith("_kg") || normalized === "kg") {
    return "Kilograms";
  }
  if (normalized.includes("gram") || normalized.endsWith("_g") || normalized === "g") {
    return "Grams";
  }
  if (normalized.includes("millil") || normalized.endsWith("_ml") || normalized === "ml") {
    return "Millilitres";
  }
  if (normalized === "l" || normalized.endsWith("_l")) return "Litres";
  if (normalized.includes("tablespoon") || normalized === "tbsp") {
    return "Tablespoons";
  }
  if (normalized.includes("teaspoon") || normalized === "tsp") {
    return "Teaspoons";
  }
  if (normalized.includes("cup")) return "Cup (Unspecified)";

  return capitalizeWords(unit.replace(/[_-]+/g, " "));
}

function StatCell({
  icon,
  value,
  label,
  borderRight,
}: {
  icon: "timer" | "chefHat" | "chart";
  value: string;
  label: string;
  borderRight?: boolean;
}) {
  return (
    <View style={[styles.statCell, borderRight && styles.statCellBorder]}>
      <Icon name={icon} size={15} color={theme.colors.textMutedAlt} />
      <AppText style={styles.statCellValue}>{value}</AppText>
      <AppText style={styles.statCellLabel}>{label}</AppText>
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

function getIngredientQuantityUnitLabel({
  quantity,
  unit,
  fallback,
}: {
  quantity: string | number | null | undefined;
  unit: string | null | undefined;
  fallback: string;
}) {
  if (quantity == null && unit == null) {
    return fallback;
  }

  return [quantity, unit]
    .filter((value) => value !== null && value !== undefined && value !== "")
    .join(" ");
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: theme.colors.white,
  },
  scroll: {
    flex: 1,
    backgroundColor: theme.colors.white,
  },
  scrollContent: {
    paddingBottom: 108,
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
  errorNotice: {
    width: "100%",
    paddingHorizontal: theme.spacing.xl,
  },
  headerBlock: {
    flexShrink: 0,
  },
  photo: {
    height: 205,
  },
  photoButtons: {
    position: "absolute",
    top: 52,
    left: 20,
    right: 20,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  roundButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: theme.colors.card,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: theme.colors.text,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
  },
  favoriteButtonActive: {
    backgroundColor: theme.colors.navy,
    borderColor: theme.colors.navy,
  },
  titleBlock: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 4,
  },
  tagRow: {
    flexDirection: "row",
    gap: 6,
    flexWrap: "wrap",
    marginBottom: 12,
  },
  tag: {
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#D2D8CB",
    backgroundColor: "#EAEDE6",
  },
  tagText: {
    fontFamily: theme.fontFamily.body,
    fontSize: 11,
    letterSpacing: 0,
    textTransform: "uppercase",
    color: theme.colors.text,
  },
  heroTitle: {
    fontFamily: theme.fontFamily.display,
    fontSize: 26,
    letterSpacing: 0,
    lineHeight: 30,
    color: theme.colors.navy,
    marginBottom: 14,
  },
  statsCard: {
    flexDirection: "row",
    backgroundColor: theme.colors.background,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    overflow: "hidden",
    shadowColor: theme.colors.text,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.14,
    shadowRadius: 6,
    elevation: 2,
  },
  statCell: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 13,
    paddingHorizontal: 4,
    gap: 6,
  },
  statCellBorder: {
    borderRightWidth: 1,
    borderRightColor: theme.colors.border,
  },
  statCellValue: {
    fontFamily: theme.fontFamily.monoBold,
    fontSize: 13,
    color: theme.colors.text,
  },
  statCellLabel: {
    fontFamily: theme.fontFamily.mono,
    fontSize: 11,
    color: theme.colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0,
  },
  body: {
    paddingHorizontal: 20,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.md,
    marginTop: 20,
    marginBottom: 12,
  },
  sectionTitle: {
    fontFamily: theme.fontFamily.monoBold,
    fontSize: 12,
    color: theme.colors.textMuted,
    letterSpacing: 0,
    textTransform: "uppercase",
  },
  sectionRule: {
    flex: 1,
    height: 1,
    backgroundColor: theme.colors.border,
  },
  servingCard: {
    backgroundColor: theme.colors.background,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 16,
    padding: theme.spacing.lg,
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    shadowColor: theme.colors.text,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.14,
    shadowRadius: 6,
    elevation: 2,
  },
  servingButton: {
    width: 44,
    height: 44,
    borderRadius: 11,
    backgroundColor: theme.colors.card2,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  servingValueWrap: {
    flex: 1,
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "center",
    gap: 6,
  },
  servingValue: {
    fontFamily: theme.fontFamily.display,
    fontSize: 30,
    color: theme.colors.navy,
  },
  servingLabel: {
    fontFamily: theme.fontFamily.body,
    fontSize: 13,
    color: theme.colors.textMedium,
  },
  unitModeRow: {
    flexDirection: "row",
    gap: 8,
  },
  unitModeButton: {
    flex: 1,
    height: 46,
    minWidth: 0,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.cream,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 5,
  },
  unitModeButtonSelected: {
    borderColor: theme.colors.navy,
    backgroundColor: theme.colors.navy,
  },
  unitModeButtonText: {
    fontFamily: theme.fontFamily.bodySemiBold,
    fontSize: 13,
    color: theme.colors.text,
    textAlign: "center",
  },
  unitModeButtonTextSelected: {
    color: theme.colors.onDark,
  },
  ingredientsCard: {
    backgroundColor: theme.colors.white,
  },
  ingredientItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.md,
    paddingVertical: 17,
    paddingHorizontal: 2,
  },
  ingredientItemDivider: {
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  ingredientName: {
    flex: 1,
    fontFamily: theme.fontFamily.body,
    fontSize: 15.5,
    color: theme.colors.text,
  },
  ingredientChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    flexShrink: 0,
    maxWidth: "48%",
    backgroundColor: theme.colors.card2,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 9,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  ingredientChipText: {
    flexShrink: 1,
    fontFamily: theme.fontFamily.monoBold,
    fontSize: 14,
    color: theme.colors.text,
  },
  ingredientPlainAmount: {
    fontFamily: theme.fontFamily.mono,
    fontSize: 14,
    color: theme.colors.textMuted,
    flexShrink: 0,
    maxWidth: "48%",
  },
  pressed: {
    opacity: 0.85,
  },
  costRow: {
    backgroundColor: theme.colors.background,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 16,
    padding: theme.spacing.lg,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: theme.spacing.lg,
    shadowColor: theme.colors.text,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.14,
    shadowRadius: 6,
    elevation: 2,
  },
  costMain: {
    flex: 1,
  },
  costPer: {
    alignItems: "flex-end",
  },
  costLabel: {
    fontFamily: theme.fontFamily.monoBold,
    fontSize: 12,
    color: theme.colors.textMuted,
    letterSpacing: 0,
    textTransform: "uppercase",
    marginBottom: 5,
  },
  costValue: {
    fontFamily: theme.fontFamily.display,
    fontSize: 26,
    lineHeight: 28,
    color: theme.colors.navy3,
  },
  costValueSecondary: {
    fontFamily: theme.fontFamily.monoBold,
    fontSize: 16,
    color: theme.colors.navy,
  },
  stepsCard: {
    position: "relative",
  },
  stepsLine: {
    position: "absolute",
    left: 13,
    top: 14,
    bottom: 14,
    width: 2,
    backgroundColor: theme.colors.border,
  },
  stepItem: {
    flexDirection: "row",
    gap: 14,
    marginBottom: 20,
  },
  stepNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: theme.colors.navy,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 1,
    flexShrink: 0,
  },
  stepNumberText: {
    fontFamily: theme.fontFamily.display,
    fontSize: 13,
    color: theme.colors.onDark,
  },
  stepText: {
    flex: 1,
    fontFamily: theme.fontFamily.body,
    fontSize: 15,
    lineHeight: 24,
    color: theme.colors.text,
    paddingTop: 3,
  },
  toolSection: {
    backgroundColor: theme.colors.card,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 16,
    padding: theme.spacing.lg,
  },
  toolSectionTitle: {
    fontFamily: theme.fontFamily.bodySemiBold,
    fontSize: 14,
    color: theme.colors.navy,
    marginBottom: 6,
  },
  toolItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.md,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(216,227,202,0.7)",
  },
  toolItemLast: {
    borderBottomWidth: 0,
  },
  toolInfo: {
    flex: 1,
  },
  toolName: {
    fontFamily: theme.fontFamily.bodySemiBold,
    fontSize: 14,
    color: theme.colors.text,
  },
  toolPrice: {
    fontFamily: theme.fontFamily.mono,
    fontSize: 13,
    color: theme.colors.textMedium,
    marginTop: 3,
  },
  toolAddButton: {
    backgroundColor: theme.colors.orange,
    borderRadius: 999,
    paddingHorizontal: 15,
    paddingVertical: 8,
  },
  toolAddText: {
    fontFamily: theme.fontFamily.bodySemiBold,
    fontSize: 12,
    color: theme.colors.text,
  },
  ctaBar: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 24,
  },
  ctaCost: {
    minWidth: 74,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
    backgroundColor: theme.colors.card,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    height: 58,
    shadowColor: theme.colors.text,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.14,
    shadowRadius: 6,
    elevation: 2,
  },
  ctaCostLabel: {
    fontFamily: theme.fontFamily.mono,
    fontSize: 12,
    color: theme.colors.textMuted,
    textTransform: "uppercase",
  },
  ctaCostValue: {
    fontFamily: theme.fontFamily.monoBold,
    fontSize: 16,
    color: theme.colors.navy3,
  },
  ctaButton: {
    flex: 1,
    height: 58,
    borderRadius: 999,
    backgroundColor: theme.colors.navy,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  ctaButtonText: {
    fontFamily: theme.fontFamily.bodySemiBold,
    fontSize: 15,
    color: theme.colors.onDark,
  },
  unitSheet: {
    paddingBottom: 24,
  },
  unitSheetEyebrow: {
    fontFamily: theme.fontFamily.monoBold,
    fontSize: 12,
    color: theme.colors.textMuted,
    letterSpacing: 0,
    textTransform: "uppercase",
    marginBottom: 4,
  },
  unitSheetTitle: {
    fontFamily: theme.fontFamily.display,
    fontSize: 19,
    color: theme.colors.text,
    marginBottom: 14,
  },
  unitSheetOptions: {
    maxHeight: 360,
  },
  unitSheetOptionsContent: {
    flexGrow: 0,
  },
  unitSheetOption: {
    minHeight: 52,
    paddingHorizontal: 4,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  unitSheetOptionLast: {
    borderBottomWidth: 0,
  },
  unitSheetOptionName: {
    flex: 1,
    fontFamily: theme.fontFamily.bodyMedium,
    fontSize: 15,
    color: theme.colors.text,
  },
  unitSheetOptionNameSelected: {
    fontFamily: theme.fontFamily.bodyBold,
    color: theme.colors.navy,
  },
  unitSheetOptionRight: {
    maxWidth: "58%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 8,
  },
  unitSheetPreview: {
    flexShrink: 1,
    fontFamily: theme.fontFamily.mono,
    fontSize: 12.5,
    color: theme.colors.textMedium,
    textAlign: "right",
  },
});
