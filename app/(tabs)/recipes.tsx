import { router } from "expo-router";
import { useMemo, useState } from "react";
import {
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { RecipeTile } from "../../src/components/recipe/RecipeTile";
import { AppText } from "../../src/components/ui/AppText";
import { EmptyState } from "../../src/components/ui/EmptyState";
import { FilterChip } from "../../src/components/ui/FilterChip";
import { Screen } from "../../src/components/ui/Screen";
import { SearchInput } from "../../src/components/ui/SearchInput";
import { RECIPE_FILTERS } from "../../src/data/recipeFilters";
import { RECIPES } from "../../src/data/recipes";
import { theme } from "../../src/theme/theme";

export default function RecipesScreen() {
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState("all");

  const filteredRecipes = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return RECIPES.filter((recipe) => {
      const matchesFilter =
        activeFilter === "all" || recipe.filters.includes(activeFilter);

      const matchesSearch =
        normalizedSearch.length === 0 ||
        recipe.name.toLowerCase().includes(normalizedSearch) ||
        recipe.tags.some((tag) =>
          tag.toLowerCase().includes(normalizedSearch)
        ) ||
        recipe.ingredients.some((ingredient) =>
          ingredient.name.toLowerCase().includes(normalizedSearch)
        );

      return matchesFilter && matchesSearch;
    });
  }, [activeFilter, search]);

  return (
    <Screen>
      <Decorations />

      <View style={styles.header}>
        <View>
          <AppText style={styles.eyebrow}>RECIPES</AppText>
          <AppText style={styles.title}>{RECIPES.length} Recipes</AppText>
        </View>

        <Pressable style={styles.iconButton}>
          <AppText style={styles.iconText}>🔍</AppText>
        </Pressable>
      </View>

      <SearchInput
        value={search}
        onChangeText={setSearch}
        placeholder="Search jollof, egusi, pasta…"
      />

      <View style={styles.filterWrapper}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterContent}
        >
          {RECIPE_FILTERS.map((filter) => (
            <FilterChip
              key={filter.value}
              label={filter.label}
              active={filter.value === activeFilter}
              onPress={() => setActiveFilter(filter.value)}
            />
          ))}
        </ScrollView>
      </View>

      <FlatList
        data={filteredRecipes}
        keyExtractor={(item) => item.id}
        numColumns={2}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.gridContent,
          filteredRecipes.length === 0 && styles.emptyGridContent,
        ]}
        columnWrapperStyle={
          filteredRecipes.length > 0 ? styles.columnWrapper : undefined
        }
        renderItem={({ item }) => (
          <RecipeTile
            recipe={item}
            onPress={() =>
              router.push({
                pathname: "/recipes/[id]",
                params: { id: item.id },
              })
            }
          />
        )}
        ListEmptyComponent={
          <EmptyState
            icon="🍲"
            title="No recipes found"
            message="Try another search or clear your selected filter."
          />
        }
      />
    </Screen>
  );
}

function Decorations() {
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <AppText style={[styles.deco, styles.decoLeaf]}>🌿</AppText>
      <AppText style={[styles.deco, styles.decoTomato]}>🍅</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 24,
    paddingTop: 52,
    paddingBottom: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  eyebrow: {
    fontFamily: theme.fontFamily.bodyBold,
    fontSize: 10,
    color: theme.colors.textMuted,
    letterSpacing: 2,
    textTransform: "uppercase",
    marginBottom: 3,
  },
  title: {
    fontFamily: theme.fontFamily.display,
    fontSize: 24,
    lineHeight: 28,
    color: theme.colors.navy,
  },
  iconButton: {
    width: 42,
    height: 42,
    borderRadius: 13,
    backgroundColor: theme.colors.surface,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  iconText: {
    fontSize: 18,
  },
  filterWrapper: {
    marginBottom: theme.spacing.lg,
  },
  filterContent: {
    paddingHorizontal: 20,
    gap: theme.spacing.sm,
  },
  gridContent: {
    paddingHorizontal: 20,
    paddingBottom: 110,
  },
  emptyGridContent: {
    flexGrow: 1,
    justifyContent: "center",
  },
  columnWrapper: {
    gap: theme.spacing.md,
    marginBottom: theme.spacing.md,
  },
  deco: {
    position: "absolute",
    opacity: 0.1,
  },
  decoLeaf: {
    top: "12%",
    right: "8%",
    fontSize: 34,
    transform: [{ rotate: "18deg" }],
  },
  decoTomato: {
    bottom: "18%",
    left: "4%",
    fontSize: 32,
    transform: [{ rotate: "-16deg" }],
  },
});
