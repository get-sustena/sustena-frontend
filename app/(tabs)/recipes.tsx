import { FlashList, type FlashListRef } from "@shopify/flash-list";
import { router } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { RecipeGridItem } from "../../src/components/recipe/RecipeGridItem";
import { AppText } from "../../src/components/ui/AppText";
import { Button } from "../../src/components/ui/Button";
import { EmptyState } from "../../src/components/ui/EmptyState";
import { FilterChip } from "../../src/components/ui/FilterChip";
import { Icon } from "../../src/components/ui/Icon";
import { SearchInput } from "../../src/components/ui/SearchInput";
import { SkeletonBlock, SkeletonGroup } from "../../src/components/ui/Skeleton";
import { RECIPE_FILTERS } from "../../src/data/recipeFilters";
import type { Recipe } from "../../src/data/recipes";
import { useInfiniteRecipesWithLocalFallback } from "../../src/hooks/api/useRecipes";
import {
  useProfileAnswersQuery,
  useUpdateProfileAnswersMutation,
} from "../../src/hooks/api/useProfileAnswers";
import { useDebouncedValue } from "../../src/hooks/useDebouncedValue";
import { apiRecipeToLocalRecipe } from "../../src/lib/api/adapters";
import { getApiErrorMessage } from "../../src/lib/api/errors";
import { finiteTimeCap } from "../../src/lib/plannerQuickSetup";
import { useProfileAnswersStore } from "../../src/store/profileAnswersStore";
import { theme } from "../../src/theme/theme";

const PAGE_SIZE = 30;
const SEARCH_DEBOUNCE_MS = 300;
const EXPERIENCE_OPTIONS = [
  { value: "beginner", label: "Beginner", level: 1 },
  { value: "intermediate", label: "Intermediate", level: 2 },
  { value: "advanced", label: "Advanced", level: 3 },
  { value: "pro", label: "Professional Chef", level: 4 },
] as const;

export default function RecipesScreen() {
  const insets = useSafeAreaInsets();
  const listRef = useRef<FlashListRef<Recipe>>(null);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search.trim(), SEARCH_DEBOUNCE_MS);
  const [activeFilter, setActiveFilter] = useState("all");
  const [experienceCardDismissed, setExperienceCardDismissed] = useState(false);
  const experience = useProfileAnswersStore((state) => state.experience);
  const habitTime = useProfileAnswersStore((state) => state.habitTime);
  const setProfileAnswers = useProfileAnswersStore((state) => state.setProfileAnswers);
  const updateProfileAnswers = useUpdateProfileAnswersMutation();
  useProfileAnswersQuery();
  const preferredDifficulty: "beginner" | "intermediate" | undefined =
    experience === "beginner" || experience === "intermediate"
      ? experience
      : undefined;
  const recipeParams = useMemo(
    () => ({
      search: debouncedSearch || undefined,
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
      preferredMaxTotalTimeMinutes: finiteTimeCap(habitTime),
      preferredDifficulty,
      pageSize: PAGE_SIZE,
    }),
    [activeFilter, debouncedSearch, habitTime, preferredDifficulty]
  );
  const recipesQuery = useInfiniteRecipesWithLocalFallback(recipeParams);
  const recipes = useMemo<Recipe[]>(
    () =>
      recipesQuery.data?.pages.flatMap((result) =>
        result.data.items.map(apiRecipeToLocalRecipe)
      ) ?? [],
    [recipesQuery.data]
  );
  const totalRecipes = recipesQuery.data?.pages[0]?.data.total ?? recipes.length;

  // Search and filters stay pinned, so a change can happen mid-list.
  useEffect(() => {
    listRef.current?.scrollToOffset({ offset: 0, animated: false });
  }, [activeFilter, debouncedSearch]);

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
      </View>

      <FlashList
        ref={listRef}
        data={recipes}
        keyExtractor={(item) => item.id}
        numColumns={2}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.gridContent}
        ListHeaderComponent={
          !experience && !experienceCardDismissed ? (
            <ExperienceCard
              onDismiss={() => setExperienceCardDismissed(true)}
              onSelect={(value) => {
                setProfileAnswers({ experience: value });
                updateProfileAnswers.mutate({ experience: value });
                setExperienceCardDismissed(true);
              }}
            />
          ) : null
        }
        renderItem={({ item, index }) => (
          <RecipeGridItem recipe={item} index={index} />
        )}
        onEndReached={() => {
          if (recipesQuery.hasNextPage && !recipesQuery.isFetchingNextPage) {
            void recipesQuery.fetchNextPage();
          }
        }}
        onEndReachedThreshold={0.55}
        ListEmptyComponent={
          recipesQuery.isLoading ? (
            <RecipeGridSkeleton rows={3} />
          ) : recipesQuery.isError ? (
            <View style={styles.errorState}>
              <EmptyState
                iconName="offline"
                title="Could not load recipes"
                message={getApiErrorMessage(recipesQuery.error)}
              />
              <Button title="Try again" onPress={() => recipesQuery.refetch()} />
            </View>
          ) : (
            <EmptyState
              iconName="chefHat"
              title="No recipes found"
              message="Try another search or clear your selected filter."
            />
          )
        }
        ListFooterComponent={
          recipes.length > 0 && recipesQuery.isFetchingNextPage ? (
            <RecipeGridSkeleton rows={1} />
          ) : recipes.length > 0 && !recipesQuery.hasNextPage ? (
            <AppText style={styles.endOfList}>You&apos;re all caught up.</AppText>
          ) : null
        }
      />
    </View>
  );
}

function RecipeGridSkeleton({ rows = 1 }: { rows?: number }) {
  return (
    <SkeletonGroup label="Loading recipes">
      {Array.from({ length: rows }, (_, row) => (
        <View key={row} style={styles.skeletonRow}>
          {[0, 1].map((column) => (
            <View key={column} style={styles.skeletonCard}>
              <SkeletonBlock height={104} radius={0} />
              <View style={styles.skeletonBody}>
                <SkeletonBlock width="82%" height={15} radius={4} />
                <SkeletonBlock width="55%" height={13} radius={4} />
              </View>
            </View>
          ))}
        </View>
      ))}
    </SkeletonGroup>
  );
}

function ExperienceCard({
  onDismiss,
  onSelect,
}: {
  onDismiss: () => void;
  onSelect: (value: string) => void;
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
              onPress={() => onSelect(option.value)}
              style={({ pressed }) => [
                styles.experienceOption,
                pressed && styles.pressed,
              ]}
            >
              <AppText style={styles.experienceOptionLabel}>
                {option.label}
              </AppText>
              <View style={styles.experienceDots}>
                {[1, 2, 3, 4].map((dot) => (
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
  errorState: {
    gap: theme.spacing.md,
  },
  // Matches RecipeGridItem's cells: 20px page gutter, 12px between columns
  // and rows. Each card matches RecipeTile: bordered, 104px photo, name and
  // time line.
  skeletonRow: {
    flexDirection: "row",
    gap: 12,
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  skeletonCard: {
    flex: 1,
    minWidth: 0,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: theme.colors.card,
  },
  skeletonBody: {
    paddingHorizontal: 13,
    paddingTop: 12,
    paddingBottom: 14,
    gap: 8,
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
