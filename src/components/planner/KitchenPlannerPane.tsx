import { router } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { useIngredientCatalogQuery } from "../../hooks/api/useIngredients";
import { useKitchenPlannerMutation } from "../../hooks/api/usePlanner";
import {
  useProfileAnswersQuery,
  useUpdateProfileAnswersMutation,
} from "../../hooks/api/useProfileAnswers";
import { apiRecipeToLocalRecipe } from "../../lib/api/adapters";
import { getApiErrorMessage } from "../../lib/api/errors";
import { formatNaira } from "../../lib/formatters";
import {
  TIME_CAP_BY_HABIT,
  VALID_HABIT_TIME,
  VALID_HABIT_WHO,
} from "../../lib/plannerQuickSetup";
import { useProfileAnswersStore } from "../../store/profileAnswersStore";
import { theme } from "../../theme/theme";
import type { Ingredient } from "../../types/api";
import { RecipePhoto } from "../recipe/RecipePhoto";
import { AppText } from "../ui/AppText";
import { EmptyState } from "../ui/EmptyState";
import { FilterChip } from "../ui/FilterChip";
import { Icon } from "../ui/Icon";
import { ProgressLoader } from "../ui/ProgressLoader";
import { SearchInput } from "../ui/SearchInput";
import {
  QuickPlanSetupModal,
  QuickPlanSetupValue,
} from "./QuickPlanSetupModal";

const ALL_CATEGORY = "All";
const KITCHEN_CATEGORIES = [
  ALL_CATEGORY,
  "Proteins",
  "Grains",
  "Produce",
  "Spices",
  "Dairy",
] as const;
const CATEGORY_NEEDLES: Record<string, string[]> = {
  Proteins: ["meat", "poultry", "fish", "seafood", "beans", "pulses", "nuts"],
  Grains: ["grains", "cereals", "flours", "pasta", "noodles", "tubers"],
  Produce: ["vegetables", "greens", "fruits"],
  Spices: ["herbs", "spices", "seasonings", "condiments", "sauces"],
  Dairy: ["dairy", "eggs", "alternatives"],
};

const ALL_CATEGORY_LIMIT = 10;

const EMPTY_CATALOG: Ingredient[] = [];

type Props = {
  initialCategory?: string;
};

export function KitchenPlannerPane({ initialCategory }: Props) {
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<string>(ALL_CATEGORY);
  const [selectedIngredientIds, setSelectedIngredientIds] = useState<string[]>(
    []
  );
  const [hasSearched, setHasSearched] = useState(false);
  const [isQuickSetupOpen, setIsQuickSetupOpen] = useState(false);
  const kitchenPlannerMutation = useKitchenPlannerMutation();
  const updateProfileAnswersMutation = useUpdateProfileAnswersMutation();
  const habitWho = useProfileAnswersStore((state) => state.habitWho);
  const habitTime = useProfileAnswersStore((state) => state.habitTime);
  const setProfileAnswers = useProfileAnswersStore((state) => state.setProfileAnswers);

  useProfileAnswersQuery();

  const hasSavedQuickSetup =
    habitWho !== null &&
    habitTime !== null &&
    VALID_HABIT_WHO.has(habitWho) &&
    VALID_HABIT_TIME.has(habitTime);

  const catalogQuery = useIngredientCatalogQuery();
  const catalog = catalogQuery.data ?? EMPTY_CATALOG;

  useEffect(() => {
    if (!initialCategory) {
      return;
    }

    const matchedCategory = KITCHEN_CATEGORIES.find(
      (category) => category.toLowerCase() === initialCategory.toLowerCase()
    );

    if (matchedCategory) {
      setActiveCategory(matchedCategory);
    }
  }, [initialCategory]);

  const ingredientsById = useMemo(
    () => new Map(catalog.map((ingredient) => [ingredient.id, ingredient])),
    [catalog]
  );

  const selectedIngredients = useMemo(() => {
    return selectedIngredientIds
      .map((id) => ingredientsById.get(id))
      .filter((ingredient): ingredient is Ingredient => Boolean(ingredient));
  }, [selectedIngredientIds, ingredientsById]);

  const normalizedSearch = search.trim().toLowerCase();

  const filteredIngredients = useMemo(() => {
    if (normalizedSearch.length > 0) {
      return catalog.filter((ingredient) =>
        matchesIngredientSearch(ingredient, normalizedSearch)
      );
    }

    if (activeCategory === ALL_CATEGORY && normalizedSearch.length === 0) {
      const seenIngredientIds = new Set<string>();

      return KITCHEN_CATEGORIES.filter(
        (category) => category !== ALL_CATEGORY
      ).flatMap((category) =>
        catalog
          .filter(
            (ingredient) =>
              matchesKitchenCategory(ingredient, category) &&
              !seenIngredientIds.has(ingredient.id)
          )
          .slice(0, ALL_CATEGORY_LIMIT)
          .map((ingredient) => {
            seenIngredientIds.add(ingredient.id);
            return ingredient;
          })
      );
    }

    return catalog.filter((ingredient) =>
      matchesKitchenCategory(ingredient, activeCategory)
    );
  }, [catalog, activeCategory, normalizedSearch]);

  const matches = useMemo(() => {
    return (
      kitchenPlannerMutation.data?.matches
        .filter((match) => match.score > 0 && match.score <= 100)
        .map((match) => ({
          recipe: apiRecipeToLocalRecipe(match.recipe),
          score: match.score,
          rankingScore: match.rankingScore,
          matchedIngredientCount: match.matchedIngredientCount,
          totalRequiredIngredientCount: match.totalRequiredIngredientCount,
          missingIngredientCount: match.missingIngredientCount,
          matchedIngredients: match.matchedIngredients,
          missingIngredients: match.missingIngredients,
        })) ?? []
    );
  }, [kitchenPlannerMutation.data]);

  function toggleIngredient(ingredient: Ingredient) {
    setSelectedIngredientIds((current) => {
      if (current.includes(ingredient.id)) {
        return current.filter((id) => id !== ingredient.id);
      }

      return [...current, ingredient.id];
    });

    setHasSearched(false);
    kitchenPlannerMutation.reset();
  }

  function findMatches(setup: QuickPlanSetupValue) {
    const timeCap = TIME_CAP_BY_HABIT[setup.habitTime] ?? Number.POSITIVE_INFINITY;
    setHasSearched(true);
    kitchenPlannerMutation.mutate({
      ingredientIds: selectedIngredientIds,
      ...(Number.isFinite(timeCap) ? { maxTotalTimeMinutes: timeCap } : {}),
    });
  }

  function startFindingMatches() {
    if (!hasSavedQuickSetup) {
      setIsQuickSetupOpen(true);
      return;
    }
    findMatches({ habitWho, habitTime });
  }

  function handleQuickSetupComplete(value: QuickPlanSetupValue) {
    setProfileAnswers(value);
    setIsQuickSetupOpen(false);
    updateProfileAnswersMutation.mutate(value);
    findMatches(value);
  }

  return (
    <View style={styles.container}>
      {!hasSearched ? (
        <>
          <SearchInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search ingredients..."
          />

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoryContent}
          >
            {KITCHEN_CATEGORIES.map((category) => (
              <FilterChip
                key={category}
                label={category}
                active={category === activeCategory}
                onPress={() => setActiveCategory(category)}
              />
            ))}
          </ScrollView>

          {selectedIngredients.length > 0 ? (
            <View style={styles.selectedBar}>
              <AppText style={styles.selectedLabel}>Selected:</AppText>

              <View style={styles.selectedTags}>
                {selectedIngredients.map((ingredient) => (
                  <Pressable
                    key={ingredient.id}
                    onPress={() => toggleIngredient(ingredient)}
                    style={({ pressed }) => [
                      styles.selectedTag,
                      pressed && styles.selectedTagPressed,
                    ]}
                    accessibilityRole="button"
                    accessibilityLabel={`Remove ${ingredient.displayName}`}
                  >
                    <AppText style={styles.selectedTagText}>
                      {ingredient.displayName}
                    </AppText>
                    <Icon
                      name="close"
                      size={11}
                      color={theme.colors.onDark}
                      strokeWidth={2.2}
                    />
                  </Pressable>
                ))}
              </View>
            </View>
          ) : null}

          {catalogQuery.isPending ? (
            <ProgressLoader />
          ) : catalogQuery.isError ? (
            <EmptyState
              iconName="offline"
              title="Could not load ingredients"
              message={getApiErrorMessage(catalogQuery.error)}
            />
          ) : filteredIngredients.length === 0 ? (
            <View style={styles.ingredientEmpty}>
              <Icon
                name="pantry"
                size={26}
                color={theme.colors.textMutedAlt}
              />
              <AppText style={styles.ingredientEmptyText}>
                No ingredients found
              </AppText>
            </View>
          ) : (
            <View style={styles.ingredientGrid}>
              {filteredIngredients.map((ingredient) => {
                const isSelected = selectedIngredientIds.includes(
                  ingredient.id
                );

                return (
                  <Pressable
                    key={ingredient.id}
                    onPress={() => toggleIngredient(ingredient)}
                    style={[
                      styles.ingredientChip,
                      isSelected && styles.selectedIngredientChip,
                    ]}
                  >
                    <AppText
                      style={[
                        styles.ingredientChipText,
                        isSelected && styles.selectedIngredientChipText,
                      ]}
                    >
                      {ingredient.displayName}
                    </AppText>
                  </Pressable>
                );
              })}
            </View>
          )}

          <Pressable
            onPress={startFindingMatches}
            style={({ pressed }) => [
              styles.findButton,
              pressed && styles.pressed,
              selectedIngredientIds.length === 0 && styles.disabledButton,
            ]}
            disabled={selectedIngredientIds.length === 0}
          >
            <Icon name="discover" size={16} color={theme.colors.onDark} />
            <AppText style={styles.findButtonText}>
              Find Matching Recipes
            </AppText>
          </Pressable>
        </>
      ) : (
        <>
          <Pressable
            onPress={() => {
              setHasSearched(false);
              kitchenPlannerMutation.reset();
            }}
            style={({ pressed }) => [
              styles.changeIngredients,
              pressed && styles.pressed,
            ]}
          >
            <Icon
              name="chevronLeft"
              size={15}
              color={theme.colors.navy3}
            />
            <AppText style={styles.changeIngredientsText}>
              Change Ingredients
            </AppText>
          </Pressable>

          {kitchenPlannerMutation.isError ? (
          <EmptyState
            iconName="offline"
            title="Could not find matches"
            message={getApiErrorMessage(kitchenPlannerMutation.error)}
          />
        ) : kitchenPlannerMutation.isPending ? (
          <ProgressLoader />
        ) : matches.length === 0 ? (
          <View style={styles.emptyResults}>
            <View style={styles.emptyResultsIconWrap}>
              <Icon name="pantry" size={28} color={theme.colors.textMutedAlt} />
            </View>
            <AppText style={styles.emptyResultsText}>
              No matches found.{"\n"}Try adding more ingredients.
            </AppText>
          </View>
        ) : (
          <View style={styles.results}>
            <AppText style={styles.resultsLabel}>
              {matches.length} Matching Recipes
            </AppText>

            {matches.map((match) => (
              <Pressable
                key={match.recipe.id}
                onPress={() =>
                  router.push({
                    pathname: "/recipes/[id]",
                    params: { id: match.recipe.id },
                  })
                }
                style={({ pressed }) => [
                  styles.resultCard,
                  pressed && styles.pressed,
                ]}
              >
                <RecipePhoto
                  imageUrl={match.recipe.imageUrl}
                  style={styles.resultThumb}
                />

                <View style={styles.resultInfo}>
                  <AppText style={styles.resultName} numberOfLines={1}>
                    {match.recipe.name}
                  </AppText>

                  <AppText style={styles.resultMeta}>
                    {match.recipe.time}
                    {match.recipe.cost !== null
                      ? ` · ${formatNaira(match.recipe.cost)}`
                      : ""}
                  </AppText>

                  <AppText style={styles.resultSubMeta}>
                    Uses {match.matchedIngredientCount} of your ingredients
                    {match.missingIngredientCount === 0
                      ? " · Ready to cook"
                      : ` · ${match.missingIngredientCount} more needed`}
                  </AppText>

                  <AppText
                    style={styles.resultIngredientMeta}
                    numberOfLines={1}
                  >
                    Have: {match.matchedIngredients.join(", ")}
                  </AppText>
                </View>

                <View style={styles.matchBadge}>
                  <AppText style={styles.matchBadgeText}>
                    {Math.round(match.score)}%
                  </AppText>
                  <AppText style={styles.matchBadgeLabel}>ready</AppText>
                </View>
              </Pressable>
            ))}
          </View>
          )}
        </>
      )}

      <QuickPlanSetupModal
        visible={isQuickSetupOpen}
        isFirstPlan={!hasSavedQuickSetup}
        actionLabel="Find Matching Recipes"
        initialValue={{
          habitWho: habitWho !== null && VALID_HABIT_WHO.has(habitWho) ? habitWho : "",
          habitTime: habitTime !== null && VALID_HABIT_TIME.has(habitTime) ? habitTime : "",
        }}
        onClose={() => setIsQuickSetupOpen(false)}
        onComplete={handleQuickSetupComplete}
      />
    </View>
  );
}

function matchesKitchenCategory(ingredient: Ingredient, category: string) {
  const backendCategory = ingredient.categoryName?.toLowerCase() ?? "";
  const needles = CATEGORY_NEEDLES[category] ?? [];

  return needles.some((needle) => backendCategory.includes(needle));
}

function matchesIngredientSearch(
  ingredient: Ingredient,
  normalizedSearch: string
) {
  if (
    ingredient.canonicalName.toLowerCase().includes(normalizedSearch) ||
    ingredient.displayName.toLowerCase().includes(normalizedSearch)
  ) {
    return true;
  }

  return (
    ingredient.aliases.some((alias) =>
      alias.toLowerCase().includes(normalizedSearch)
    ) ||
    ingredient.searchTerms.some((term) =>
      term.toLowerCase().includes(normalizedSearch)
    ) ||
    ingredient.localNames.some((localName) =>
      localName.name.toLowerCase().includes(normalizedSearch)
    )
  );
}

const styles = StyleSheet.create({
  container: {
    paddingBottom: theme.spacing["3xl"],
  },
  categoryContent: {
    paddingHorizontal: 20,
    gap: 8,
    marginBottom: 14,
  },
  selectedBar: {
    marginHorizontal: 20,
    backgroundColor: theme.colors.card2,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 10,
    padding: 12,
    marginBottom: 14,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  selectedLabel: {
    fontFamily: theme.fontFamily.monoBold,
    fontSize: 12,
    color: theme.colors.textMedium,
    letterSpacing: 0.6,
    textTransform: "uppercase",
  },
  selectedTags: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    flex: 1,
  },
  selectedTag: {
    backgroundColor: theme.colors.navy,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  selectedTagPressed: {
    opacity: 0.78,
  },
  selectedTagText: {
    fontFamily: theme.fontFamily.bodySemiBold,
    fontSize: 11,
    color: theme.colors.onDark,
  },
  ingredientGrid: {
    marginHorizontal: 20,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 18,
  },
  ingredientEmpty: {
    minHeight: 140,
    marginHorizontal: 20,
    marginBottom: 18,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  ingredientEmptyText: {
    fontFamily: theme.fontFamily.bodyMedium,
    fontSize: 14,
    color: theme.colors.textMuted,
  },
  ingredientChip: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.card,
  },
  selectedIngredientChip: {
    borderColor: theme.colors.navy,
    backgroundColor: theme.colors.navy,
  },
  ingredientChipText: {
    fontFamily: theme.fontFamily.bodyMedium,
    fontSize: 13,
    color: theme.colors.text,
  },
  selectedIngredientChipText: {
    color: theme.colors.onDark,
  },
  findButton: {
    marginHorizontal: 20,
    minHeight: 48,
    borderRadius: 999,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: theme.spacing.sm,
    backgroundColor: theme.colors.navy,
    marginBottom: 20,
  },
  findButtonText: {
    fontFamily: theme.fontFamily.bodySemiBold,
    fontSize: 15,
    color: theme.colors.onDark,
  },
  disabledButton: {
    opacity: 0.45,
  },
  pressed: {
    opacity: 0.9,
  },
  changeIngredients: {
    marginHorizontal: 20,
    marginBottom: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  changeIngredientsText: {
    fontFamily: theme.fontFamily.bodySemiBold,
    fontSize: 13.5,
    color: theme.colors.navy3,
  },
  results: {
    marginHorizontal: 20,
  },
  resultsLabel: {
    fontFamily: theme.fontFamily.monoBold,
    fontSize: 12,
    color: theme.colors.textMuted,
    letterSpacing: 1,
    textTransform: "uppercase",
    marginBottom: 12,
  },
  resultCard: {
    backgroundColor: theme.colors.card,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 14,
    padding: 12,
    marginBottom: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    shadowColor: theme.colors.text,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.14,
    shadowRadius: 6,
    elevation: 2,
  },
  resultThumb: {
    width: 52,
    height: 52,
    borderRadius: 12,
  },
  resultInfo: {
    flex: 1,
    minWidth: 0,
  },
  resultName: {
    fontFamily: theme.fontFamily.bodySemiBold,
    fontSize: 15,
    color: theme.colors.text,
  },
  resultMeta: {
    fontFamily: theme.fontFamily.mono,
    fontSize: 13,
    color: theme.colors.textMedium,
    marginTop: 3,
  },
  resultSubMeta: {
    fontFamily: theme.fontFamily.bodySemiBold,
    fontSize: 11,
    color: theme.colors.navy3,
    marginTop: 4,
  },
  resultIngredientMeta: {
    fontFamily: theme.fontFamily.body,
    fontSize: 11,
    color: theme.colors.textMuted,
    marginTop: 2,
  },
  matchBadge: {
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#BEE0CD",
    backgroundColor: "#E7F3EC",
    alignItems: "center",
  },
  matchBadgeText: {
    fontFamily: theme.fontFamily.monoBold,
    fontSize: 12,
    color: theme.colors.navy3,
  },
  matchBadgeLabel: {
    fontFamily: theme.fontFamily.mono,
    fontSize: 8,
    color: theme.colors.navy3,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  emptyResults: {
    alignItems: "center",
    paddingVertical: 32,
  },
  emptyResultsIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 20,
    backgroundColor: theme.colors.card2,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  emptyResultsText: {
    fontFamily: theme.fontFamily.body,
    fontSize: 14,
    lineHeight: 21,
    color: theme.colors.textMedium,
    textAlign: "center",
  },
});
