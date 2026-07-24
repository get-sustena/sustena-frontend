import { router } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { FlatList, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { RecipeTile } from "../../src/components/recipe/RecipeTile";
import { AppText } from "../../src/components/ui/AppText";
import { Button } from "../../src/components/ui/Button";
import { EmptyState } from "../../src/components/ui/EmptyState";
import { FilterChip } from "../../src/components/ui/FilterChip";
import { Icon } from "../../src/components/ui/Icon";
import { ProgressLoader } from "../../src/components/ui/ProgressLoader";
import { SearchInput } from "../../src/components/ui/SearchInput";
import { RECIPE_FILTERS } from "../../src/data/recipeFilters";
import type { Recipe } from "../../src/data/recipes";
import { useRecipesWithLocalFallback } from "../../src/hooks/api/useRecipes";
import { apiRecipeToLocalRecipe } from "../../src/lib/api/adapters";
import { getApiErrorMessage } from "../../src/lib/api/errors";
import { theme } from "../../src/theme/theme";

const PAGE_SIZE = 30;
const EXPERIENCE_OPTIONS = [
  { value: "beginner", label: "Beginner", level: 1 },
  { value: "intermediate", label: "Intermediate", level: 2 },
  { value: "advanced", label: "Advanced", level: 3 },
] as const;

export default function RecipesScreen() {
  const insets = useSafeAreaInsets();
  const listRef = useRef<FlatList>(null);
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [recipePages, setRecipePages] = useState<Record<number, Recipe[]>>({});
  const [experienceCardDismissed, setExperienceCardDismissed] = useState(false);
  const recipeParams = useMemo(
    () => ({
      search: search.trim() || undefined,
      tag:
        activeFilter === "all" ||
        activeFilter === "budget" ||
        activeFilter === "quick"
          ? undefined
          : activeFilter === "highprotein"
            ? "high-protein"
            : activeFilter,
      maxCost: activeFilter === "budget" ? 5000 : undefined,
      quickAndEasy: activeFilter === "quick" ? true : undefined,
      maxTotalTimeMinutes: activeFilter === "quick" ? 45 : undefined,
      page,
      pageSize: PAGE_SIZE,
    }),
    [activeFilter, page, search]
  );
  const recipesQuery = useRecipesWithLocalFallback(recipeParams);
  const recipes = useMemo(
    () =>
      Object.keys(recipePages)
        .map(Number)
        .sort((a, b) => a - b)
        .flatMap((pageNumber) => recipePages[pageNumber]),
    [recipePages]
  );
  const totalRecipes = recipesQuery.data?.total ?? recipes.length;
  const totalPages = Math.max(1, Math.ceil(totalRecipes / PAGE_SIZE));
  const canLoadMore = page < totalPages;

  useEffect(() => {
    setPage(1);
    setRecipePages({});
    listRef.current?.scrollToOffset({ offset: 0, animated: false });
  }, [activeFilter, search]);

  useEffect(() => {
    if (!recipesQuery.data) {
      return;
    }

    const items = recipesQuery.data.items.map(apiRecipeToLocalRecipe);
    setRecipePages((current) =>
      page === 1 ? { 1: items } : { ...current, [page]: items }
    );
  }, [page, recipesQuery.data]);

  return (
    <View style={styles.screen}>
      <View
        style={[
          styles.header,
          { paddingTop: Math.max(52, insets.top + 5) },
        ]}
      >
        <AppText style={styles.title}>
          {recipesQuery.data ? `${totalRecipes} Recipes` : "Recipes"}
        </AppText>

        <Pressable
          onPress={() => router.push("/saved-recipes")}
          style={({ pressed }) => [
            styles.bookmarkButton,
            pressed && styles.pressed,
          ]}
          accessibilityRole="button"
          accessibilityLabel="Open saved recipes"
        >
          <Icon name="bookmark" size={19} color={theme.colors.text} />
        </Pressable>
      </View>

      <FlatList
        ref={listRef}
        data={recipes}
        keyExtractor={(item) => item.id}
        numColumns={2}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.gridContent,
          recipes.length === 0 && styles.emptyGridContent,
        ]}
        columnWrapperStyle={recipes.length > 0 ? styles.columnWrapper : undefined}
        ListHeaderComponent={
          <View>
            <SearchInput
              value={search}
              onChangeText={setSearch}
              placeholder="Search jollof, egusi, pasta..."
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

            {!experienceCardDismissed ? (
              <ExperienceCard
                onDismiss={() => setExperienceCardDismissed(true)}
                onSelect={() => setExperienceCardDismissed(true)}
              />
            ) : null}
          </View>
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
        onEndReached={() => {
          if (canLoadMore && !recipesQuery.isFetching) {
            setPage((current) => current + 1);
          }
        }}
        onEndReachedThreshold={0.55}
        ListEmptyComponent={
          recipesQuery.isLoading ? (
            <ProgressLoader message="Fetching the latest recipes for you..." />
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
          recipes.length > 0 && recipesQuery.isFetching ? (
            <RecipeGridSkeleton />
          ) : recipes.length > 0 && !canLoadMore ? (
            <AppText style={styles.endOfList}>You&apos;re all caught up.</AppText>
          ) : null
        }
      />
    </View>
  );
}

function RecipeGridSkeleton() {
  return (
    <View style={styles.skeletonRow} accessibilityLabel="Loading more recipes">
      {[0, 1].map((item) => (
        <View key={item} style={styles.skeletonCard}>
          <View style={styles.skeletonImage} />
          <View style={styles.skeletonLineWide} />
          <View style={styles.skeletonLineShort} />
        </View>
      ))}
    </View>
  );
}

function ExperienceCard({
  onDismiss,
  onSelect,
}: {
  onDismiss: () => void;
  onSelect: () => void;
}) {
  return (
    <View style={styles.experienceWrap}>
      <View style={styles.experienceCard}>
        <Pressable
          onPress={onDismiss}
          style={({ pressed }) => [
            styles.experienceClose,
            pressed && styles.pressed,
          ]}
          accessibilityRole="button"
          accessibilityLabel="Dismiss experience question"
        >
          <Icon name="close" size={14} color={theme.colors.textMuted} />
        </Pressable>

        <AppText style={styles.experienceEyebrow}>Tune your feed</AppText>
        <AppText style={styles.experienceTitle}>
          How do you feel in the kitchen?
        </AppText>

        <View style={styles.experienceOptions}>
          {EXPERIENCE_OPTIONS.map((option) => (
            <Pressable
              key={option.value}
              onPress={onSelect}
              style={({ pressed }) => [
                styles.experienceOption,
                pressed && styles.pressed,
              ]}
            >
              <AppText style={styles.experienceOptionLabel}>
                {option.label}
              </AppText>
              <View style={styles.experienceDots}>
                {[1, 2, 3].map((dot) => (
                  <View
                    key={dot}
                    style={[
                      styles.experienceDot,
                      dot <= option.level && styles.experienceDotActive,
                    ]}
                  />
                ))}
              </View>
            </Pressable>
          ))}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: theme.colors.white,
  },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 16,
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
  },
  title: {
    fontFamily: theme.fontFamily.display,
    fontSize: 26,
    letterSpacing: 0,
    color: theme.colors.navy,
  },
  bookmarkButton: {
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
    shadowOpacity: 0.14,
    shadowRadius: 6,
    elevation: 2,
  },
  filterWrapper: {
    marginBottom: 16,
  },
  filterContent: {
    paddingHorizontal: 20,
    gap: theme.spacing.sm,
  },
  gridContent: {
    paddingBottom: 110,
  },
  emptyGridContent: {
    flexGrow: 1,
  },
  errorState: {
    gap: theme.spacing.md,
  },
  columnWrapper: {
    gap: 12,
    marginBottom: 12,
    paddingHorizontal: 20,
  },
  skeletonRow: {
    flexDirection: "row",
    gap: 12,
    paddingHorizontal: 20,
    paddingTop: 4,
    paddingBottom: 24,
  },
  skeletonCard: {
    flex: 1,
    minWidth: 0,
  },
  skeletonImage: {
    width: "100%",
    aspectRatio: 1.08,
    borderRadius: 8,
    backgroundColor: theme.colors.card2,
    marginBottom: 10,
  },
  skeletonLineWide: {
    width: "82%",
    height: 13,
    borderRadius: 4,
    backgroundColor: theme.colors.card2,
    marginBottom: 7,
  },
  skeletonLineShort: {
    width: "52%",
    height: 10,
    borderRadius: 4,
    backgroundColor: theme.colors.card2,
  },
  endOfList: {
    paddingTop: 10,
    paddingBottom: 28,
    textAlign: "center",
    fontFamily: theme.fontFamily.bodyMedium,
    fontSize: 12,
    color: theme.colors.textMuted,
  },
  pressed: {
    opacity: 0.82,
  },
  experienceWrap: {
    paddingHorizontal: 20,
    paddingBottom: 4,
  },
  experienceCard: {
    position: "relative",
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 18,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 18,
    backgroundColor: theme.colors.white,
    shadowColor: theme.colors.text,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.08,
    shadowRadius: 24,
    elevation: 2,
  },
  experienceClose: {
    position: "absolute",
    top: 12,
    right: 12,
    width: 26,
    height: 26,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.card2,
    zIndex: 1,
  },
  experienceEyebrow: {
    fontFamily: theme.fontFamily.monoBold,
    fontSize: 11,
    color: theme.colors.textMuted,
    letterSpacing: 0,
    textTransform: "uppercase",
    marginBottom: 8,
  },
  experienceTitle: {
    paddingRight: 26,
    marginBottom: 14,
    fontFamily: theme.fontFamily.display,
    fontSize: 17,
    color: theme.colors.text,
  },
  experienceOptions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  experienceOption: {
    minHeight: 38,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    borderRadius: 999,
    backgroundColor: theme.colors.white,
  },
  experienceOptionLabel: {
    fontFamily: theme.fontFamily.bodySemiBold,
    fontSize: 13,
    color: theme.colors.text,
  },
  experienceDots: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  experienceDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: theme.colors.border,
  },
  experienceDotActive: {
    backgroundColor: theme.colors.green,
  },
});
