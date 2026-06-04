import { router } from "expo-router";
import { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import {
  INGREDIENTS,
  INGREDIENT_CATEGORIES,
  Ingredient,
} from "../../data/ingredients";
import { Recipe } from "../../data/recipes";
import { formatNaira } from "../../lib/formatters";
import { matchRecipesByIngredients } from "../../lib/recipeMatching";
import { theme } from "../../theme/theme";
import { AppText } from "../ui/AppText";
import { EmptyState } from "../ui/EmptyState";
import { FilterChip } from "../ui/FilterChip";
import { SearchInput } from "../ui/SearchInput";

type Props = {
  recipes: Recipe[];
};

export function KitchenPlannerPane({ recipes }: Props) {
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] =
    useState<(typeof INGREDIENT_CATEGORIES)[number]>("All");
  const [selectedIngredientIds, setSelectedIngredientIds] = useState<string[]>(
    []
  );
  const [hasSearched, setHasSearched] = useState(false);

  const selectedIngredients = useMemo(() => {
    return INGREDIENTS.filter((ingredient) =>
      selectedIngredientIds.includes(ingredient.id)
    );
  }, [selectedIngredientIds]);

  const visibleIngredients = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return INGREDIENTS.filter((ingredient) => {
      const matchesCategory =
        activeCategory === "All" || ingredient.category === activeCategory;

      const matchesSearch =
        normalizedSearch.length === 0 ||
        ingredient.name.toLowerCase().includes(normalizedSearch);

      return matchesCategory && matchesSearch;
    });
  }, [activeCategory, search]);

  const matches = useMemo(() => {
    return matchRecipesByIngredients({
      recipes,
      selectedIngredientNames: selectedIngredients.map(
        (ingredient) => ingredient.name
      ),
    });
  }, [recipes, selectedIngredients]);

  function toggleIngredient(ingredient: Ingredient) {
    setSelectedIngredientIds((current) => {
      if (current.includes(ingredient.id)) {
        return current.filter((id) => id !== ingredient.id);
      }

      return [...current, ingredient.id];
    });

    setHasSearched(false);
  }

  return (
    <View style={styles.container}>
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
        {INGREDIENT_CATEGORIES.map((category) => (
          <FilterChip
            key={category}
            label={getCategoryLabel(category)}
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
              <View key={ingredient.id} style={styles.selectedTag}>
                <AppText style={styles.selectedTagText}>
                  {ingredient.name}
                </AppText>
              </View>
            ))}
          </View>
        </View>
      ) : null}

      <View style={styles.ingredientGrid}>
        {visibleIngredients.map((ingredient) => {
          const isSelected = selectedIngredientIds.includes(ingredient.id);

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
                {ingredient.name}
              </AppText>
            </Pressable>
          );
        })}
      </View>

      <Pressable
        onPress={() => setHasSearched(true)}
        style={({ pressed }) => [
          styles.findButton,
          pressed && styles.pressed,
          selectedIngredientIds.length === 0 && styles.disabledButton,
        ]}
        disabled={selectedIngredientIds.length === 0}
      >
        <AppText style={styles.findButtonText}>
          Find Matching Recipes 🔍
        </AppText>
      </Pressable>

      {hasSearched ? (
        matches.length === 0 ? (
          <EmptyState
            icon="🥬"
            title="No matching recipes"
            message="Try adding more ingredients or selecting common staples like rice, tomatoes, onions, or eggs."
          />
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
                <AppText style={styles.resultEmoji}>
                  {match.recipe.emoji}
                </AppText>

                <View style={styles.resultInfo}>
                  <AppText style={styles.resultName}>
                    {match.recipe.name}
                  </AppText>

                  <AppText style={styles.resultMeta}>
                    ⏱ {match.recipe.time} · {formatNaira(match.recipe.cost)}
                  </AppText>

                  <AppText style={styles.resultSubMeta} numberOfLines={1}>
                    Have: {match.matchedIngredients.join(", ")}
                  </AppText>
                </View>

                <View style={styles.matchBadge}>
                  <AppText style={styles.matchBadgeText}>
                    {Math.round(match.score * 100)}%
                  </AppText>
                </View>
              </Pressable>
            ))}
          </View>
        )
      ) : null}
    </View>
  );
}

function getCategoryLabel(category: string) {
  const map: Record<string, string> = {
    All: "All",
    Proteins: "🍖 Proteins",
    Grains: "🌾 Grains",
    Produce: "🥦 Produce",
    Spices: "🌶️ Spices",
    Dairy: "🥛 Dairy",
  };

  return map[category] ?? category;
}

const styles = StyleSheet.create({
  container: {
    paddingBottom: theme.spacing["3xl"],
  },
  categoryContent: {
    paddingHorizontal: 20,
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.lg,
  },
  selectedBar: {
    marginHorizontal: 20,
    backgroundColor: theme.colors.navyDim,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.sm,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.lg,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.spacing.sm,
  },
  selectedLabel: {
    fontFamily: theme.fontFamily.bodyBold,
    fontSize: 11,
    color: theme.colors.textMuted,
  },
  selectedTags: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.spacing.sm,
    flex: 1,
  },
  selectedTag: {
    backgroundColor: theme.colors.navy,
    borderRadius: theme.radius.full,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 4,
  },
  selectedTagText: {
    fontFamily: theme.fontFamily.bodyBold,
    fontSize: 10,
    color: theme.colors.onDark,
  },
  ingredientGrid: {
    paddingHorizontal: 20,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.xl,
  },
  ingredientChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: theme.radius.full,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  selectedIngredientChip: {
    borderColor: theme.colors.orange,
    backgroundColor: theme.colors.orange,
  },
  ingredientChipText: {
    fontFamily: theme.fontFamily.bodyBold,
    fontSize: 12,
    color: theme.colors.textMedium,
  },
  selectedIngredientChipText: {
    color: theme.colors.white,
  },
  findButton: {
    marginHorizontal: 20,
    minHeight: 48,
    borderRadius: theme.radius.md,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.navy,
    marginBottom: theme.spacing.xl,
  },
  findButtonText: {
    fontFamily: theme.fontFamily.bodyBold,
    fontSize: 14,
    color: theme.colors.onDark,
  },
  disabledButton: {
    opacity: 0.45,
  },
  pressed: {
    opacity: 0.82,
    transform: [{ scale: 0.98 }],
  },
  results: {
    paddingHorizontal: 20,
  },
  resultsLabel: {
    fontFamily: theme.fontFamily.bodyBold,
    fontSize: 10,
    color: theme.colors.textMuted,
    letterSpacing: 1.5,
    textTransform: "uppercase",
    marginBottom: theme.spacing.md,
  },
  resultCard: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.md,
  },
  resultEmoji: {
    fontSize: 28,
  },
  resultInfo: {
    flex: 1,
  },
  resultName: {
    fontFamily: theme.fontFamily.bodyBold,
    fontSize: 14,
    color: theme.colors.navy,
  },
  resultMeta: {
    fontFamily: theme.fontFamily.body,
    fontSize: 11,
    color: theme.colors.textMuted,
    marginTop: 2,
  },
  resultSubMeta: {
    fontFamily: theme.fontFamily.body,
    fontSize: 10,
    color: theme.colors.textMuted,
    marginTop: 2,
  },
  matchBadge: {
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 5,
    borderRadius: theme.radius.sm,
    backgroundColor: theme.colors.orangeDim,
  },
  matchBadgeText: {
    fontFamily: theme.fontFamily.bodyBold,
    fontSize: 11,
    color: theme.colors.orange,
  },
});
