import { router } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { RecipeTile } from "../../src/components/recipe/RecipeTile";
import { AppText } from "../../src/components/ui/AppText";
import { Button } from "../../src/components/ui/Button";
import { EmptyState } from "../../src/components/ui/EmptyState";
import { FilterChip } from "../../src/components/ui/FilterChip";
import { Screen } from "../../src/components/ui/Screen";
import { SearchInput } from "../../src/components/ui/SearchInput";
import { RECIPE_FILTERS } from "../../src/data/recipeFilters";
import { useRecipesWithLocalFallback } from "../../src/hooks/api/useRecipes";
import { apiRecipeToLocalRecipe } from "../../src/lib/api/adapters";
import { getApiErrorMessage } from "../../src/lib/api/errors";
import { theme } from "../../src/theme/theme";

const PAGE_SIZE = 30;

export default function RecipesScreen() {
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState("all");
  const [page, setPage] = useState(1);
  const recipeParams = useMemo(
    () => ({
      search: search.trim() || undefined,
      tag: activeFilter === "all" ? undefined : activeFilter,
      page,
      pageSize: PAGE_SIZE,
    }),
    [activeFilter, page, search]
  );
  const recipesQuery = useRecipesWithLocalFallback(recipeParams);
  const recipes = recipesQuery.data?.items.map(apiRecipeToLocalRecipe) ?? [];
  const totalRecipes = recipesQuery.data?.total ?? recipes.length;
  const totalPages = Math.max(1, Math.ceil(totalRecipes / PAGE_SIZE));
  const canGoPrevious = page > 1 && !recipesQuery.isFetching;
  const canGoNext = page < totalPages && !recipesQuery.isFetching;

  useEffect(() => {
    setPage(1);
  }, [activeFilter, search]);

  return (
    <Screen>
      <Decorations />

      <View style={styles.header}>
        <View>
          <AppText style={styles.eyebrow}>RECIPES</AppText>
          <AppText style={styles.title}>{totalRecipes} Recipes</AppText>
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
        data={recipes}
        keyExtractor={(item) => item.id}
        numColumns={2}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.gridContent,
          recipes.length === 0 && styles.emptyGridContent,
        ]}
        columnWrapperStyle={recipes.length > 0 ? styles.columnWrapper : undefined}
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
          recipesQuery.isLoading ? (
            <EmptyState
              icon="🍲"
              title="Loading recipes"
              message="Fetching the latest recipes for you."
            />
          ) : recipesQuery.isError ? (
            <View style={styles.errorState}>
              <EmptyState
                icon="⚠️"
                title="Could not load recipes"
                message={getApiErrorMessage(recipesQuery.error)}
              />
              <Button title="Try again" onPress={() => recipesQuery.refetch()} />
            </View>
          ) : (
            <EmptyState
              icon="🍲"
              title="No recipes found"
              message="Try another search or clear your selected filter."
            />
          )
        }
        ListFooterComponent={
          recipesQuery.data && totalPages > 1 ? (
            <View style={styles.pagination}>
              <Button
                title="Previous"
                variant="card"
                onPress={() => setPage((current) => Math.max(1, current - 1))}
                disabled={!canGoPrevious}
                style={styles.paginationButton}
              />

              <AppText style={styles.paginationText}>
                Page {page} of {totalPages}
              </AppText>

              <Button
                title={recipesQuery.isFetching ? "Loading..." : "Next"}
                variant="primary"
                onPress={() =>
                  setPage((current) => Math.min(totalPages, current + 1))
                }
                disabled={!canGoNext}
                style={styles.paginationButton}
              />
            </View>
          ) : null
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
  errorState: {
    gap: theme.spacing.md,
  },
  columnWrapper: {
    gap: theme.spacing.md,
    marginBottom: theme.spacing.md,
  },
  pagination: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.sm,
    paddingTop: theme.spacing.md,
    paddingBottom: theme.spacing["2xl"],
  },
  paginationButton: {
    flex: 1,
  },
  paginationText: {
    minWidth: 78,
    textAlign: "center",
    fontFamily: theme.fontFamily.bodyBold,
    fontSize: 11,
    color: theme.colors.textMuted,
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
