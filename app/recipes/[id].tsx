
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import { Href, router, useLocalSearchParams } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { useMemo, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { RecipePhoto } from "../../src/components/recipe/RecipePhoto";
import { IngredientImage } from "../../src/components/ingredient/IngredientImage";
import { ShoppingListDestinationSheet } from "../../src/components/shopping/ShoppingListDestinationSheet";
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
import {
  insertShoppingListItems,
  replaceShoppingListItemsForList,
} from "../../src/db/shoppingListRepository";
import { enqueueSyncOperation } from "../../src/db/syncQueueRepository";
import {
  useAddFavoriteMutation,
  useRemoveFavoriteMutation,
} from "../../src/hooks/api/useFavorites";
import { useIngredientCatalogQuery } from "../../src/hooks/api/useIngredients";
import {
  useRecipeDetailWithLocalFallback,
} from "../../src/hooks/api/useRecipes";
import { useUnitsQuery } from "../../src/hooks/api/useUnits";
import {
  apiRecipeToLocalRecipe,
  apiShoppingItemToLocalItem,
} from "../../src/lib/api/adapters";
import { getApiErrorMessage } from "../../src/lib/api/errors";
import { shoppingListsApi } from "../../src/lib/api";
import { formatNaira } from "../../src/lib/formatters";
import {
  createInitialIngredientUnitSelections,
} from "../../src/lib/ingredientUnits";
import { formatScaledInstruction } from "../../src/lib/instructionScaling";
import { getRecipeMeals, MEAL_LABELS } from "../../src/lib/mealTime";
import { scaleAmountText, scaleCost } from "../../src/lib/scaling";
import {
  generateShoppingListItemsFromRecipe,
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
import { useShoppingListsStore } from "../../src/store/shoppingListsStore";
import { closeSheet, openSheet, showToast } from "../../src/store/uiStore";
import { theme } from "../../src/theme/theme";
import type {
  RecipeDetail as ApiRecipeDetail,
  RecipeIngredient as ApiRecipeIngredient,
} from "../../src/types/api";
import { createLocalId } from "../../src/lib/id";
import { readRecipeSource } from "../../src/lib/recipeSource";
import { CookedButton } from "../../src/components/recipe/CookedButton";

// --rd-muted in the v6.8 recipe page.
const INGREDIENT_CHEVRON_COLOR = "#686E66";

export default function RecipeDetailScreen() {
  const db = useSQLiteContext();
  const insets = useSafeAreaInsets();
  const { width: windowWidth } = useWindowDimensions();
  // v6.8: font-size clamp(27px, 8vw, 34px), line-height 1.04, tracking -0.035em.
  const titleSize = Math.min(34, Math.max(27, windowWidth * 0.08));
  const params = useLocalSearchParams<{ id: string; source?: string }>();
  const { id } = params;
  const source = readRecipeSource(params.source);

  const recipeQuery = useRecipeDetailWithLocalFallback(id, source);
  const recipeDetail = recipeQuery.data;
  const shouldSyncApi = recipeQuery.source === "api" && Boolean(recipeDetail);
  const recipe = recipeDetail
    ? apiRecipeToLocalRecipe(recipeDetail)
    : undefined;
  const addFavoriteMutation = useAddFavoriteMutation();
  const removeFavoriteMutation = useRemoveFavoriteMutation();

  const defaultServingSize = usePreferencesStore(
    (state) => state.defaultServingSize
  );
  const defaultUnitMode = usePreferencesStore((state) => state.defaultUnitMode);
  const hapticsEnabled = usePreferencesStore((state) => state.hapticsEnabled);

  const addItems = useShoppingListStore((state) => state.addItems);
  const hydrateItems = useShoppingListStore((state) => state.hydrateItems);
  const activeListId = useShoppingListsStore((state) => state.activeListId);
  const shoppingLists = useShoppingListsStore((state) => state.lists);

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

    // Persist favorites locally before attempting server sync.
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

  async function handleAddToShoppingList(destinationListId: string) {
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

    const batchPayload = {
      clientMutationId: createLocalId("recipe_shopping"),
      recipes: [
        {
          recipeId: recipe.id,
          servings,
          unitOverrides: (recipeDetail?.ingredients ?? []).flatMap(
            (ingredient) => {
              const unit = getSelectedApiIngredientOption(ingredient)
                .selectedOption?.unit;
              return unit ? [{ ingredientId: ingredient.id, unit }] : [];
            }
          ),
        },
      ],
    };
    try {
      if (!shouldSyncApi) throw new Error("Recipe is only available offline");
      const updatedList = await shoppingListsApi.addRecipesToShoppingList(
        destinationListId,
        batchPayload
      );
      const authoritativeItems = updatedList.items.map((item) => ({
        ...apiShoppingItemToLocalItem(item),
        listId: destinationListId,
      }));
      if (destinationListId === activeListId) {
        hydrateItems(authoritativeItems);
      }
      await replaceShoppingListItemsForList(db, destinationListId, authoritativeItems);
    } catch {
      const localItems = items.map((item) => ({ ...item, listId: destinationListId }));
      if (destinationListId === activeListId) {
        addItems(localItems);
      }
      await insertShoppingListItems(db, localItems);
      await enqueueSyncOperation(db, "shopping_list_recipe_batch", {
        listId: destinationListId,
        ...batchPayload,
      });
    }

    if (hapticsEnabled) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }

    router.push({
      pathname: "/shopping/[id]",
      params: { id: destinationListId },
    });
  }

  function chooseShoppingListDestination() {
    if (shoppingLists.length <= 1) {
      handleAddToShoppingList(activeListId);
      return;
    }
    openSheet(
      <ShoppingListDestinationSheet
        lists={shoppingLists}
        activeListId={activeListId}
        onSelect={(listId) => {
          closeSheet();
          handleAddToShoppingList(listId);
        }}
      />
    );
  }

  async function addToolToShoppingList(tool: { id: string; name: string }) {
    const clientMutationId = createLocalId("tool_shopping");
    const now = new Date().toISOString();

    try {
      const created = await shoppingListsApi.addShoppingListItemToList(
        activeListId,
        {
          name: tool.name,
          quantity: "1 item",
          displayQuantity: "1 item",
          unit: "item",
          category: "Tools",
          estimatedPrice: null,
          priceStatus: "unknown",
          clientMutationId,
        }
      );
      const item = {
        ...apiShoppingItemToLocalItem(created),
        listId: activeListId,
      };
      addItems([item]);
      await insertShoppingListItems(db, [item]);
    } catch {
      const localItem = {
        id: createLocalId("shopping_item"),
        name: tool.name,
        emoji: "",
        quantity: "1 item",
        amount: 1,
        displayQuantity: "1 item",
        unit: "item",
        category: "Tools",
        estimatedPrice: null,
        priceStatus: "unknown" as const,
        clientMutationId,
        checked: false,
        createdAt: now,
        updatedAt: now,
        listId: activeListId,
      };
      addItems([localItem]);
      await insertShoppingListItems(db, [localItem]);
      await enqueueSyncOperation(db, "shopping_list_item_add", {
        listId: activeListId,
        temporaryId: localItem.id,
        name: tool.name,
        quantity: "1 item",
        amount: 1,
        displayQuantity: "1 item",
        unit: "item",
        category: "Tools",
        clientMutationId,
      });
    }

    showToast(`${tool.name} added to your shopping list`, "success");
  }

  if (recipeQuery.isLoading && !recipe) {
    return <ProgressLoader variant="screen" />;
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
      <View style={[styles.topBar, { paddingTop: insets.top + 8 }]}>
        <Pressable onPress={() => router.back()} style={styles.topBarButton}>
          <Icon name="chevronLeft" size={24} color={theme.colors.text} />
        </Pressable>

        <Pressable
          onPress={handleFavoritePress}
          style={[
            styles.topBarButton,
            isFavorite && styles.favoriteButtonActive,
          ]}
        >
          <Icon
            name="bookmark"
            size={22}
            color={theme.colors.text}
            filled={isFavorite}
          />
        </Pressable>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        automaticallyAdjustContentInsets={false}
        contentInsetAdjustmentBehavior="never"
      >
        <RecipePhoto imageUrl={recipe.imageUrl} style={styles.photo} />

        <View style={styles.titleBlock}>
          <View style={styles.tagRow}>
            {displayTags.map((tag) => (
              <View key={tag} style={styles.tag}>
                <AppText style={styles.tagText}>{tag}</AppText>
              </View>
            ))}
          </View>

          <AppText
            style={[
              styles.heroTitle,
              {
                fontSize: titleSize,
                lineHeight: titleSize * 1.04,
                letterSpacing: titleSize * -0.035,
              },
            ]}
          >
            {recipe.name}
          </AppText>

          <Pressable
            disabled={!recipeDetail?.creator}
            onPress={() => {
              if (!recipeDetail?.creator) return;
              router.push(
                `/creators/${encodeURIComponent(recipeDetail.creator.handle)}` as Href
              );
            }}
            style={({ pressed }) => [
              styles.creatorRow,
              pressed && styles.pressed,
            ]}
            accessibilityRole={recipeDetail?.creator ? "button" : undefined}
            accessibilityLabel={
              recipeDetail?.creator
                ? `Open ${recipeDetail.creator.displayName}'s profile`
                : undefined
            }
          >
            {recipeDetail?.creator?.avatarUrl ? (
              <Image
                source={{ uri: recipeDetail.creator.avatarUrl }}
                contentFit="cover"
                style={styles.creatorAvatar}
              />
            ) : (
              <View style={[styles.creatorAvatar, styles.creatorAvatarFallback]}>
                <AppText style={styles.creatorInitials}>
                  {recipeDetail?.creator
                    ? getInitials(recipeDetail.creator.displayName)
                    : "SK"}
                </AppText>
              </View>
            )}
            <View style={styles.creatorCopy}>
              <AppText numberOfLines={1} style={styles.creatorName}>
                {recipeDetail?.creator?.displayName ?? "Sustena Kitchen"}
              </AppText>
              <AppText style={styles.creatorHandle}>
                @{recipeDetail?.creator?.handle ?? "sustenakitchen"}
              </AppText>
            </View>
          </Pressable>

          <View style={styles.statsCard}>
            <StatCell
              icon="timer"
              value={
                recipe.totalTimeMinutes
                  ? `${recipe.totalTimeMinutes} min`
                  : recipe.time
              }
              label="Time"
              align="flex-start"
            />
            <StatCell
              icon="star"
              value={recipeDetail?.averageRating?.toFixed(1) ?? "0.0"}
              label="Rating"
              align="center"
            />
            <StatCell
              icon="chefHat"
              value={recipe.difficulty}
              label="Level"
              align="flex-end"
            />
          </View>
        </View>

        <View style={styles.body}>
          {recipeDetail && !recipeDetail.baseServings ? null : (
            <>
              <SectionHeader title="Adjust recipe" first />
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
                    servings
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

          <SectionHeader
            title="Ingredients"
            first={Boolean(recipeDetail && !recipeDetail.baseServings)}
          />
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
                    <IngredientImage
                      ingredientId={apiIngredient.ingredientId}
                      name={ingredient.name}
                      size={44}
                    />
                    <AppText style={styles.ingredientName}>
                      {capitalizeWords(ingredient.name)}
                    </AppText>

                    {unitOptions.length > 0 ? (
                      <Pressable
                        onPress={() =>
                          openIngredientUnitSheet(
                            ingredient.id,
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
                          size={10}
                          color={INGREDIENT_CHEVRON_COLOR}
                        />
                      </Pressable>
                    ) : (
                      <View style={styles.ingredientChip}>
                        <AppText
                          numberOfLines={1}
                          style={styles.ingredientChipText}
                        >
                          {displayAmount}
                        </AppText>
                      </View>
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
                  <IngredientImage name={ingredient.name} size={44} />
                  <AppText style={styles.ingredientName}>
                    {capitalizeWords(ingredient.name)}
                  </AppText>

                  <Pressable
                    onPress={() =>
                      openIngredientUnitSheet(
                        ingredient.id,
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
                      size={10}
                      color={INGREDIENT_CHEVRON_COLOR}
                    />
                  </Pressable>
                </View>
              );
            })}
          </View>

          {scaledCost !== null ? (
            <>
              <SectionHeader title="Estimated cost" />
              <View style={styles.costRow}>
                <AppText style={styles.costValue}>
                  {formatNaira(scaledCost)}
                </AppText>

                <View style={styles.costPer}>
                  <AppText style={styles.costPerLabel}>Per person</AppText>
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

          <View style={styles.cooked}>
            <CookedButton recipeId={recipe.id} source={source} />
          </View>

          {recipe.tools.length > 0 ? (
            <View style={styles.toolSection}>
              <AppText style={styles.toolSectionTitle}>
                Need this tool?
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

                  <Pressable
                    onPress={() => void addToolToShoppingList(tool)}
                    style={({ pressed }) => [
                      styles.toolAddButton,
                      pressed && styles.pressed,
                    ]}
                    accessibilityRole="button"
                    accessibilityLabel={`Add ${tool.name} to shopping list`}
                  >
                    <AppText style={styles.toolAddText}>Add</AppText>
                  </Pressable>
                </View>
              ))}
            </View>
          ) : null}
        </View>
      </ScrollView>

      <View
        style={[
          styles.ctaBar,
          { paddingBottom: insets.bottom + 11 },
        ]}
      >
        {scaledCost !== null ? (
          <View style={styles.ctaCost}>
            <AppText style={styles.ctaCostLabel}>Total</AppText>
            <AppText style={styles.ctaCostValue}>
              {formatNaira(scaledCost)}
            </AppText>
          </View>
        ) : null}

        <Pressable
          onPress={chooseShoppingListDestination}
          style={({ pressed }) => [
            styles.ctaButton,
            pressed && styles.pressed,
          ]}
        >
          <Icon name="shop" size={18} color={theme.colors.onDark} />
          <AppText style={styles.ctaButtonText}>Add to shopping list</AppText>
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
  options,
  selectedValue,
  onSelect,
}: {
  options: IngredientUnitOption[];
  selectedValue: string;
  onSelect: (value: string) => void;
}) {
  return (
    <View style={styles.unitSheet}>
      <AppText style={styles.unitSheetTitle}>Choose a unit</AppText>

      <ScrollView
        style={styles.unitSheetOptions}
        contentContainerStyle={styles.unitSheetOptionsContent}
        showsVerticalScrollIndicator={options.length > 6}
        nestedScrollEnabled
      >
        {options.map((option) => {
          const selected = option.value === selectedValue;

          return (
            <Pressable
              key={option.value}
              onPress={() => onSelect(option.value)}
              style={[
                styles.unitSheetOption,
                selected && styles.unitSheetOptionSelected,
              ]}
              accessibilityRole="button"
              accessibilityState={{ selected }}
            >
              <AppText style={styles.unitSheetOptionName}>
                {option.label}
              </AppText>
              <View style={styles.unitSheetOptionRight}>
                <AppText style={styles.unitSheetPreview}>
                  {option.preview}
                </AppText>
                {selected ? (
                  <Icon name="check" size={16} color={theme.colors.navy3} />
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
  // Every meal the recipe suits, so lunch-and-dinner recipes show both
  // (founder, 13 October 2026).
  const meals = getRecipeMeals(uniqueCandidates).map((meal) => MEAL_LABELS[meal]);
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

  if (!meals.length) {
    takeFirstMatching(/\b(brunch|snack)\b/);
  }
  takeFirstMatching(
    /\b(low budget|budget|main dish|side dish|soup|stew|salad|dessert|drink|beverage|porridge|rice dish|pasta|swallow)\b/
  );
  takeFirstMatching(
    /\b(nigerian|west african|african|south east|south west|north east|north west|north central|yoruba|igbo|hausa|calabar|akwa ibom|delta|edo)\b/
  );

  return [
    ...meals,
    ...selected.map((tag) => capitalizeWords(tag.replace(/_/g, " "))),
  ];
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

// v6.8 lays the three stats out left, centre and right, with the label for
// screen readers only.
function StatCell({
  icon,
  value,
  label,
  align,
}: {
  icon: "timer" | "chefHat" | "star";
  value: string;
  label: string;
  align: "flex-start" | "center" | "flex-end";
}) {
  return (
    <View
      style={[styles.statCell, { justifyContent: align }]}
      accessible
      accessibilityLabel={`${label}: ${value}`}
    >
      <Icon
        name={icon}
        size={icon === "star" ? 15 : 16}
        color={icon === "star" ? theme.colors.orange : theme.colors.textMutedAlt}
        filled={icon === "star"}
      />
      <AppText style={styles.statCellValue}>{value}</AppText>
    </View>
  );
}

// The first section after the stats sits 27px below them, the rest 34px apart.
function SectionHeader({ title, first = false }: { title: string; first?: boolean }) {
  return (
    <View style={[styles.sectionHeader, first && styles.sectionHeaderFirst]}>
      <AppText style={styles.sectionTitle}>{title}</AppText>
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

function getInitials(value: string) {
  return value
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
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
  topBar: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 12,
    paddingBottom: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "transparent",
    zIndex: 5,
  },
  photo: {
    height: 205,
  },
  topBarButton: {
    width: 44,
    height: 44,
    borderRadius: 0,
    alignItems: "center",
    justifyContent: "center",
  },
  favoriteButtonActive: {
    backgroundColor: "transparent",
  },
  titleBlock: {
    paddingHorizontal: 20,
    paddingTop: 22,
    paddingBottom: 4,
  },
  tagRow: {
    flexDirection: "row",
    gap: 6,
    flexWrap: "wrap",
    marginBottom: 11,
  },
  tag: {
    minHeight: 24,
    justifyContent: "center",
    paddingHorizontal: 9,
    borderRadius: 7,
    backgroundColor: "#F1F1EF",
  },
  tagText: {
    fontFamily: theme.fontFamily.bodyBold,
    fontSize: 10.5,
    letterSpacing: 0.2625,
    textTransform: "uppercase",
    color: "#4E554D",
  },
  // Size, line height and tracking follow the screen width (see titleSize).
  heroTitle: {
    fontFamily: theme.fontFamily.display,
    color: theme.colors.navy,
    marginBottom: 12,
  },
  creatorRow: {
    marginBottom: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
  },
  creatorAvatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
  },
  creatorAvatarFallback: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.navy,
  },
  creatorInitials: {
    fontFamily: theme.fontFamily.bodySemiBold,
    fontSize: 11,
    color: theme.colors.onDark,
  },
  creatorCopy: { minWidth: 0 },
  creatorName: {
    fontFamily: theme.fontFamily.bodySemiBold,
    fontSize: 13,
    lineHeight: 15.6,
    color: theme.colors.navy,
  },
  creatorHandle: {
    fontFamily: theme.fontFamily.body,
    fontSize: 11.5,
    color: theme.colors.textMedium,
  },
  statsCard: {
    flexDirection: "row",
    gap: 10,
  },
  statCell: {
    flex: 1,
    minHeight: 22,
    alignItems: "center",
    gap: 6,
    flexDirection: "row",
  },
  statCellValue: {
    fontFamily: theme.fontFamily.bodySemiBold,
    fontSize: 13.5,
    letterSpacing: -0.135,
    color: theme.colors.navy,
  },
  body: {
    paddingHorizontal: 20,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.md,
    marginTop: 34,
    marginBottom: 14,
  },
  sectionHeaderFirst: {
    marginTop: 27,
  },
  sectionTitle: {
    fontFamily: theme.fontFamily.display,
    fontSize: 20,
    lineHeight: 22,
    color: theme.colors.navy,
    letterSpacing: -0.4,
  },
  servingCard: {
    width: 210,
    alignSelf: "center",
    backgroundColor: theme.colors.white,
    borderWidth: 0.5,
    borderColor: "#E2E2E0",
    borderRadius: 999,
    paddingVertical: 3,
    paddingHorizontal: 4,
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  servingButton: {
    width: 40,
    height: 40,
    borderRadius: 999,
    backgroundColor: theme.colors.card2,
    borderWidth: 0,
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
    fontSize: 22,
    color: theme.colors.navy,
  },
  servingLabel: {
    fontFamily: theme.fontFamily.bodyMedium,
    fontSize: 13,
    color: "#545B53",
  },
  unitModeRow: {
    flexDirection: "row",
    gap: 8,
  },
  unitModeButton: {
    flex: 1,
    height: 44,
    minWidth: 0,
    borderRadius: 999,
    borderWidth: 0.5,
    borderColor: "#E2E2E0",
    backgroundColor: theme.colors.page,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 9,
  },
  unitModeButtonSelected: {
    backgroundColor: theme.colors.navy,
  },
  unitModeButtonText: {
    fontFamily: theme.fontFamily.bodySemiBold,
    fontSize: 12.5,
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
    gap: 11,
    minHeight: 62,
    paddingVertical: 4,
  },
  ingredientItemDivider: {
    borderBottomWidth: 0,
  },
  ingredientName: {
    flex: 1,
    fontFamily: theme.fontFamily.bodySemiBold,
    fontSize: 15,
    color: theme.colors.text,
  },
  // v6.8 .rd-v6-amount.
  ingredientChip: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    flexShrink: 0,
    minHeight: 36,
    maxWidth: 136,
    backgroundColor: "#F1F1EF",
    borderWidth: 0.75,
    borderColor: "#E2E2E0",
    borderRadius: 999,
    paddingHorizontal: 10,
  },
  ingredientChipText: {
    flexShrink: 1,
    fontFamily: theme.fontFamily.bodySemiBold,
    fontSize: 13,
    letterSpacing: -0.13,
    color: theme.colors.navy,
  },
  pressed: {
    opacity: 0.85,
  },
  // v6.8 .rd-v6-cost: the total on the left, "Per person" above its amount on the right.
  costRow: {
    backgroundColor: "#F5F3EC",
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 17,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 16,
  },
  costPer: {
    alignItems: "flex-end",
  },
  costValue: {
    fontFamily: theme.fontFamily.display,
    fontSize: 26,
    lineHeight: 26,
    color: theme.colors.navy3,
  },
  costPerLabel: {
    fontFamily: theme.fontFamily.body,
    fontSize: 12,
    letterSpacing: 0.96,
    textTransform: "uppercase",
    color: theme.colors.textMuted,
    marginBottom: 5,
  },
  costValueSecondary: {
    fontFamily: theme.fontFamily.body,
    fontSize: 16,
    color: theme.colors.navy,
  },
  stepsCard: {
    position: "relative",
  },
  stepsLine: {
    position: "absolute",
    left: 42,
    top: 2,
    bottom: 2,
    width: 0.75,
    backgroundColor: "#E2E2E0",
  },
  stepItem: {
    flexDirection: "row",
    gap: 30,
    marginBottom: 26,
  },
  stepNumber: {
    width: 28,
    height: 28,
    borderRadius: 0,
    backgroundColor: theme.colors.white,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 1,
    flexShrink: 0,
  },
  stepNumberText: {
    fontFamily: theme.fontFamily.display,
    fontSize: 21,
    lineHeight: 24,
    letterSpacing: -0.42,
    color: theme.colors.navy,
  },
  stepText: {
    flex: 1,
    fontFamily: theme.fontFamily.body,
    fontSize: 15,
    lineHeight: 24,
    color: "#20241F",
    paddingTop: 3,
  },
  // v6.8 .rd-cooked.
  cooked: {
    marginTop: 30,
  },
  toolSection: {
    marginTop: 30,
    backgroundColor: "transparent",
    borderTopWidth: 0.75,
    borderTopColor: theme.colors.border,
    paddingVertical: 16,
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
    borderBottomWidth: 0.75,
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
    fontFamily: theme.fontFamily.body,
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
    gap: 12,
    paddingHorizontal: 20,
    paddingTop: 11,
    borderTopWidth: 0.75,
    borderTopColor: "#E2E2E0",
    backgroundColor: "rgba(255,255,255,0.97)",
  },
  ctaCost: {
    flexShrink: 0,
  },
  ctaCostLabel: {
    fontFamily: theme.fontFamily.body,
    fontSize: 11,
    color: theme.colors.textMedium,
  },
  ctaCostValue: {
    fontFamily: theme.fontFamily.display,
    fontSize: 18,
    color: theme.colors.navy,
  },
  ctaButton: {
    flex: 1,
    height: 48,
    borderRadius: 999,
    backgroundColor: theme.colors.navy,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  ctaButtonText: {
    fontFamily: theme.fontFamily.bodyBold,
    fontSize: 14,
    color: theme.colors.onDark,
  },
  unitSheet: {
    paddingBottom: 24,
  },
  // v6.8 .unit-sheet-*.
  unitSheetTitle: {
    fontFamily: theme.fontFamily.display,
    fontSize: 21,
    lineHeight: 23,
    letterSpacing: -0.42,
    color: theme.colors.navy,
    marginBottom: 14,
  },
  unitSheetOptions: {
    maxHeight: 360,
  },
  unitSheetOptionsContent: {
    flexGrow: 0,
    gap: 4,
  },
  unitSheetOption: {
    minHeight: 54,
    paddingHorizontal: 8,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 14,
  },
  unitSheetOptionSelected: {
    backgroundColor: "#F1F1EF",
  },
  unitSheetOptionName: {
    flex: 1,
    fontFamily: theme.fontFamily.bodySemiBold,
    fontSize: 15,
    lineHeight: 19,
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
    fontFamily: theme.fontFamily.bodyMedium,
    fontSize: 13,
    color: theme.colors.textMedium,
    textAlign: "right",
  },
});
