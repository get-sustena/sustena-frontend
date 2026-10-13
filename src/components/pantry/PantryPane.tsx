import { FlashList, type FlashListRef } from "@shopify/flash-list";
import { Image } from "expo-image";
import { router } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { type ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { Pressable, ScrollView, StyleSheet, TextInput, useWindowDimensions, View } from "react-native";
import { replaceStoredPantry } from "../../db/pantryRepository";
import { appImages } from "../../assets/appImages";
import { useIngredientCatalogQuery } from "../../hooks/api/useIngredients";
import { useAddPantryItemsMutation, usePantryQuery, useRemovePantryItemMutation } from "../../hooks/api/usePantry";
import { useKitchenPlannerMutation } from "../../hooks/api/usePlanner";
import { apiRecipeToLocalRecipe } from "../../lib/api/adapters";
import { getApiErrorMessage } from "../../lib/api/errors";
import { formatNaira } from "../../lib/formatters";
import { matchesPantryCategory, matchesPantrySearch, PANTRY_CATEGORIES } from "../../lib/pantryIngredients";
import { finiteTimeCap } from "../../lib/plannerQuickSetup";
import { usePantryStore } from "../../store/pantryStore";
import { useProfileAnswersStore } from "../../store/profileAnswersStore";
import { closeSheet, openSheet, showToast } from "../../store/uiStore";
import { theme } from "../../theme/theme";
import type { Ingredient } from "../../types/api";
import { IngredientImage } from "../ingredient/IngredientImage";
import { TAB_BAR_CLEARANCE } from "../layout/tabBarClearance";
import { RecipePhoto } from "../recipe/RecipePhoto";
import { AppText } from "../ui/AppText";
import { EmptyState } from "../ui/EmptyState";
import { Icon } from "../ui/Icon";
import { PantryIngredientPickerSheet } from "./PantryIngredientPickerSheet";
import { PantryListSkeleton, PantryMatchesSkeleton } from "./PantrySkeletons";

type Props = { initialCategory?: string };

export function PantryPane({ initialCategory }: Props) {
  const db = useSQLiteContext();
  const { height } = useWindowDimensions();
  const listRef = useRef<FlashListRef<Ingredient>>(null);
  const [search, setSearch] = useState("");
  const [searchFocused, setSearchFocused] = useState(false);
  const [activeCategory, setActiveCategory] = useState(initialCategory ?? "All");
  const [showResults, setShowResults] = useState(false);
  const isChangingPantry = useRef(false);
  const catalogQuery = useIngredientCatalogQuery();
  const pantryQuery = usePantryQuery();
  const addMutation = useAddPantryItemsMutation();
  const removeMutation = useRemovePantryItemMutation();
  const matchMutation = useKitchenPlannerMutation();
  const habitTime = useProfileAnswersStore((state) => state.habitTime);
  const pantryIds = usePantryStore((state) => state.ingredientIds);
  const hydratePantry = usePantryStore((state) => state.hydratePantry);
  const addIngredients = usePantryStore((state) => state.addIngredients);
  const removeIngredient = usePantryStore((state) => state.removeIngredient);
  const catalog = useMemo(() => catalogQuery.data ?? [], [catalogQuery.data]);
  const catalogById = useMemo(() => new Map(catalog.map((ingredient) => [ingredient.id, ingredient])), [catalog]);
  const pantryIngredients = useMemo(
    () => pantryIds.map((id) => catalogById.get(id)).filter((item) => item !== undefined),
    [catalogById, pantryIds]
  );
  const visibleIngredients = pantryIngredients.filter(
    (ingredient) => matchesPantryCategory(ingredient, activeCategory) && matchesPantrySearch(ingredient, search)
  );
  const matches = matchMutation.isPending || matchMutation.isError
    ? []
    : matchMutation.data?.matches.map((match) => ({ ...match, recipe: apiRecipeToLocalRecipe(match.recipe) })) ?? [];

  // Search and categories stay pinned, so a change can happen mid-list.
  useEffect(() => {
    listRef.current?.scrollToOffset({ offset: 0, animated: false });
  }, [activeCategory, search]);

  useEffect(() => {
    const ids = pantryQuery.data?.items.map((item) => item.ingredientId);
    if (!ids || isChangingPantry.current) return;
    hydratePantry(ids);
    void replaceStoredPantry(db, ids).catch((error) => {
      showToast(getApiErrorMessage(error), "danger");
    });
  }, [db, hydratePantry, pantryQuery.data]);

  function openIngredientPicker() {
    openSheet(
      <PantryIngredientPickerSheet
        ingredients={catalog}
        savedIngredientIds={pantryIds}
        onClose={closeSheet}
        onAdd={async (ingredientIds) => {
          if (isChangingPantry.current) return;
          isChangingPantry.current = true;
          const previousIds = usePantryStore.getState().ingredientIds;
          const optimisticIds = [...new Set([...previousIds, ...ingredientIds])];
          try {
            addIngredients(ingredientIds);
            await replaceStoredPantry(db, optimisticIds);
            const response = await addMutation.mutateAsync(ingredientIds);
            const ids = response.items.map((item) => item.ingredientId);
            hydratePantry(ids);
            await replaceStoredPantry(db, ids);
            closeSheet();
            showToast(`${ingredientIds.length} ingredient${ingredientIds.length === 1 ? "" : "s"} added to pantry`, "success");
          } catch (error) {
            hydratePantry(previousIds);
            await replaceStoredPantry(db, previousIds).catch(() => undefined);
            showToast(getApiErrorMessage(error), "danger");
          } finally {
            isChangingPantry.current = false;
          }
        }}
      />
    );
  }

  async function handleRemove(ingredientId: string) {
    if (isChangingPantry.current) return;
    isChangingPantry.current = true;
    const previous = usePantryStore.getState().ingredientIds;
    const optimisticIds = previous.filter((id) => id !== ingredientId);
    try {
      removeIngredient(ingredientId);
      await replaceStoredPantry(db, optimisticIds);
      const response = await removeMutation.mutateAsync(ingredientId);
      const ids = response.items.map((item) => item.ingredientId);
      hydratePantry(ids);
      await replaceStoredPantry(db, ids);
      const name = catalogById.get(ingredientId)?.displayName ?? "Ingredient";
      showToast(`${name} removed from pantry`, "default", {
        label: "Undo",
        onPress: () => { void handleRestore(ingredientId); },
      });
    } catch (error) {
      hydratePantry(previous);
      await replaceStoredPantry(db, previous).catch(() => undefined);
      showToast(getApiErrorMessage(error), "danger");
    } finally {
      isChangingPantry.current = false;
    }
  }

  async function handleRestore(ingredientId: string) {
    if (isChangingPantry.current) return;
    isChangingPantry.current = true;
    const previous = usePantryStore.getState().ingredientIds;
    const optimisticIds = [...new Set([...previous, ingredientId])];
    try {
      addIngredients([ingredientId]);
      await replaceStoredPantry(db, optimisticIds);
      const response = await addMutation.mutateAsync([ingredientId]);
      const ids = response.items.map((item) => item.ingredientId);
      hydratePantry(ids);
      await replaceStoredPantry(db, ids);
    } catch (error) {
      hydratePantry(previous);
      await replaceStoredPantry(db, previous).catch(() => undefined);
      showToast(getApiErrorMessage(error), "danger");
    } finally {
      isChangingPantry.current = false;
    }
  }

  if (catalogQuery.isPending || (pantryQuery.isPending && !pantryIds.length)) return <PaneScroll><PantryListSkeleton /></PaneScroll>;
  if (catalogQuery.isError) return <PaneScroll><EmptyState iconName="offline" title="Could not load ingredients" message={getApiErrorMessage(catalogQuery.error)} /></PaneScroll>;

  if (showResults) {
    return (
      <PaneScroll>
        <Pressable onPress={() => setShowResults(false)} style={styles.resultsBack}>
          <Icon name="chevronLeft" size={16} color="#1F7048" />
          <AppText style={styles.resultsBackText}>Edit pantry</AppText>
        </Pressable>
        {matchMutation.isPending ? <PantryMatchesSkeleton /> : null}
        {matchMutation.isError ? <EmptyState iconName="offline" title="Could not find matches" message={getApiErrorMessage(matchMutation.error)} /> : null}
        {!matchMutation.isPending && !matchMutation.isError && !matches.length ? (
          <View style={styles.noMatches}>
            <View style={styles.noMatchesIcon}><Icon name="pantry" size={28} color={theme.colors.textMutedAlt} /></View>
            <AppText style={styles.noMatchesText}>No matches found.{"\n"}Try adding more ingredients.</AppText>
          </View>
        ) : null}
        {matches.length ? <AppText style={styles.resultsCount}>{matches.length} Matching Recipes</AppText> : null}
        <View style={styles.results}>
          {matches.map((match) => (
            <Pressable key={match.recipe.id} onPress={() => router.push({ pathname: "/recipes/[id]", params: { id: match.recipe.id } })} style={styles.resultCard}>
              <RecipePhoto imageUrl={match.recipe.imageUrl} style={styles.resultPhoto} />
              <View style={styles.resultCopy}>
                <AppText style={styles.resultName} numberOfLines={1}>{match.recipe.name}</AppText>
                <AppText style={styles.resultMeta}>{match.recipe.time}{match.recipe.cost !== null ? ` · ${formatNaira(match.recipe.cost)}` : ""}</AppText>
                <AppText style={styles.resultMatch}>
                  Uses {match.matchedIngredientCount} of your ingredients · {match.missingIngredientCount === 0 ? "Ready to cook" : `${match.missingIngredientCount} more needed`}
                </AppText>
                <AppText style={styles.resultMeta} numberOfLines={1}>
                  Have: {match.matchedIngredients.join(", ")}
                </AppText>
              </View>
              <View style={styles.matchBadge}><AppText style={styles.matchValue}>{Math.round(match.score)}%</AppText><AppText style={styles.matchLabel}>ready</AppText></View>
            </Pressable>
          ))}
        </View>
      </PaneScroll>
    );
  }

  if (!pantryIds.length) {
    return (
      <PaneScroll>
        <View style={styles.empty}>
          <AppText style={styles.emptyCopy}>Add what you already have at home. Sustena will use it to find meals you can actually make.</AppText>
          <Image
            source={appImages.emptyStates.pantry}
            contentFit="contain"
            style={[styles.emptyVisual, {
              height: height <= 700 ? 190 : 224,
              marginTop: Math.min(118, Math.max(96, height * 0.14)),
            }]}
          />
          <Pressable onPress={openIngredientPicker} style={styles.emptyButton}>
            <Icon name="plus" size={17} color={theme.colors.text} />
            <AppText style={styles.emptyButtonText}>Add ingredients</AppText>
          </Pressable>
          <AppText style={styles.emptyTip}>The more ingredients you have in your pantry, the better our meal recommendations</AppText>
        </View>
      </PaneScroll>
    );
  }

  return (
    <View style={styles.pane}>
      <View style={styles.pinned}>
        <View style={styles.sectionHeader}>
          <AppText style={styles.sectionTitle}>Your ingredients</AppText>
          <Pressable onPress={openIngredientPicker} style={styles.addSmall}>
            <Icon name="plus" size={16} color={theme.colors.onDark} />
            <AppText style={styles.addSmallText}>Add ingredients</AppText>
          </Pressable>
        </View>
        <View style={[styles.search, searchFocused && styles.searchFocused]}>
          <Icon name="discover" size={18} color={theme.colors.textMedium} />
          <TextInput value={search} onChangeText={setSearch} onFocus={() => setSearchFocused(true)} onBlur={() => setSearchFocused(false)} placeholder="Search your pantry" placeholderTextColor={theme.colors.textMuted} style={styles.searchInput} />
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categories}>
          {PANTRY_CATEGORIES.map((category) => (
            <Pressable key={category} onPress={() => setActiveCategory(category)} style={[styles.category, activeCategory === category && styles.categoryActive]}>
              <AppText style={[styles.categoryText, activeCategory === category && styles.categoryTextActive]}>{category}</AppText>
            </Pressable>
          ))}
        </ScrollView>
      </View>
      <FlashList
        ref={listRef}
        data={visibleIngredients}
        keyExtractor={(ingredient) => ingredient.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.pageContent}
        ListHeaderComponent={<AppText style={styles.count}>{pantryIds.length} ingredients{activeCategory !== "All" ? ` · ${activeCategory}` : ""}</AppText>}
        ListEmptyComponent={
          <View style={styles.searchEmpty}>
            <View style={styles.searchEmptyIcon}>
              <Icon name="discover" size={24} color={theme.colors.textMutedAlt} />
            </View>
            <AppText style={styles.searchEmptyTitle}>No ingredients found</AppText>
            <AppText style={styles.searchEmptyCopy}>
              Try another search or choose a different category.
            </AppText>
          </View>
        }
        renderItem={({ item: ingredient }) => (
          <View style={styles.ingredientCell}>
            <View style={styles.ingredientRow}>
              <IngredientImage
                ingredientId={ingredient.id}
                name={ingredient.displayName}
                size={48}
                style={styles.ingredientThumb}
              />
              <AppText style={styles.ingredientName} numberOfLines={1}>{ingredient.displayName}</AppText>
              <Pressable onPress={() => void handleRemove(ingredient.id)} style={styles.remove} accessibilityLabel={`Remove ${ingredient.displayName} from pantry`}>
                <Icon name="trash" size={17} color={theme.colors.textMedium} />
              </Pressable>
            </View>
          </View>
        )}
        ListFooterComponent={
          <Pressable onPress={() => { setShowResults(true); matchMutation.mutate({ ingredientIds: pantryIds, maxTotalTimeMinutes: finiteTimeCap(habitTime) }); }} style={styles.findButton}>
            <AppText style={styles.findButtonText}>Find matching recipes</AppText>
          </Pressable>
        }
      />
    </View>
  );
}

// Loading, empty and results states scroll as one page, as the Pantry tab did before it pinned the search.
function PaneScroll({ children }: { children: ReactNode }) {
  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.pageContent}>
      {children}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  pane: { flex: 1 },
  pinned: { paddingHorizontal: 20 },
  pageContent: { paddingHorizontal: 20, paddingBottom: TAB_BAR_CLEARANCE },
  empty: { paddingTop: 4 },
  emptyCopy: { maxWidth: 330, fontFamily: theme.fontFamily.body, fontSize: 14, lineHeight: 21, color: theme.colors.textMedium },
  emptyVisual: { width: "100%", maxWidth: 326, height: 224, alignSelf: "center", marginTop: 96, marginBottom: 28 },
  emptyButton: { alignSelf: "center", minHeight: 44, paddingHorizontal: 14, borderRadius: 999, backgroundColor: theme.colors.card2, borderWidth: 0.75, borderColor: theme.colors.border, flexDirection: "row", alignItems: "center", gap: 8 },
  emptyButtonText: { fontFamily: theme.fontFamily.bodyBold, fontSize: 13.5, color: theme.colors.text },
  emptyTip: { maxWidth: 300, alignSelf: "center", textAlign: "center", marginTop: 24, fontFamily: theme.fontFamily.body, fontSize: 11.5, lineHeight: 17, color: theme.colors.textMedium },
  sectionHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 14 },
  sectionTitle: { fontFamily: theme.fontFamily.display, fontSize: 18, color: theme.colors.navy },
  addSmall: { minHeight: 44, paddingHorizontal: 14, backgroundColor: theme.colors.navy, borderRadius: 999, flexDirection: "row", alignItems: "center", gap: 7 },
  addSmallText: { fontFamily: theme.fontFamily.bodyBold, fontSize: 13.5, color: theme.colors.onDark },
  search: { minHeight: 48, borderWidth: 0.75, borderColor: theme.colors.border, borderRadius: 13, backgroundColor: theme.colors.white, flexDirection: "row", alignItems: "center", paddingHorizontal: 13, gap: 10 },
  searchFocused: { borderColor: "#1F7048", boxShadow: "0 0 0 3px rgba(31,112,72,0.10)" },
  searchInput: { flex: 1, fontFamily: theme.fontFamily.body, fontSize: 14.5, color: theme.colors.text, outlineStyle: "none" } as never,
  categories: { gap: 6, paddingVertical: 13, paddingRight: 48 },
  category: { minHeight: 32, justifyContent: "center", paddingHorizontal: 11, borderRadius: 999, borderWidth: 0.75, borderColor: theme.colors.border, backgroundColor: theme.colors.white },
  categoryActive: { backgroundColor: theme.colors.navy, borderColor: theme.colors.navy },
  categoryText: { fontFamily: theme.fontFamily.bodySemiBold, fontSize: 11.75, color: theme.colors.textMedium },
  categoryTextActive: { color: theme.colors.onDark },
  count: { fontFamily: theme.fontFamily.bodySemiBold, fontSize: 12.5, color: theme.colors.textMedium, marginBottom: 9 },
  ingredientCell: { paddingBottom: 8 },
  searchEmpty: { minHeight: 260, padding: 32, borderWidth: 0.75, borderColor: theme.colors.border, borderRadius: 18, backgroundColor: theme.colors.white, alignItems: "center", justifyContent: "center" },
  searchEmptyIcon: { width: 56, height: 56, borderRadius: 17, backgroundColor: theme.colors.card2, alignItems: "center", justifyContent: "center", marginBottom: 14 },
  searchEmptyTitle: { fontFamily: theme.fontFamily.display, fontSize: 18, color: theme.colors.text },
  searchEmptyCopy: { maxWidth: 250, marginTop: 8, textAlign: "center", fontFamily: theme.fontFamily.body, fontSize: 13, lineHeight: 19, color: theme.colors.textMedium },
  ingredientRow: { minHeight: 60, flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 10, borderWidth: 0.75, borderColor: theme.colors.border, borderRadius: 14, backgroundColor: theme.colors.card },
  ingredientThumb: { width: 48, height: 48 },
  ingredientName: { flex: 1, fontFamily: theme.fontFamily.bodySemiBold, fontSize: 14.5, color: theme.colors.text },
  remove: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  findButton: { minHeight: 52, marginTop: 10, borderRadius: 999, backgroundColor: theme.colors.navy, alignItems: "center", justifyContent: "center" },
  findButtonText: { fontFamily: theme.fontFamily.bodyBold, fontSize: 14.5, color: theme.colors.onDark },
  resultsBack: { minHeight: 44, flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 10 },
  resultsBackText: { fontFamily: theme.fontFamily.bodySemiBold, fontSize: 13.5, color: "#1F7048" },
  resultsCount: { fontFamily: theme.fontFamily.monoBold, fontSize: 12, letterSpacing: 1, textTransform: "uppercase", color: theme.colors.textMuted, marginTop: 6, marginBottom: 12 },
  noMatches: { paddingHorizontal: 20, paddingVertical: 32, alignItems: "center" },
  noMatchesIcon: { width: 56, height: 56, borderRadius: 20, backgroundColor: "#EEF2E7", alignItems: "center", justifyContent: "center", marginBottom: 14 },
  noMatchesText: { fontFamily: theme.fontFamily.body, fontSize: 14, lineHeight: 21, color: theme.colors.textMedium, textAlign: "center" },
  results: { gap: 10 },
  resultCard: { padding: 12, borderWidth: 0.75, borderColor: theme.colors.border, borderRadius: 14, backgroundColor: theme.colors.card, flexDirection: "row", alignItems: "center", gap: 14 },
  resultPhoto: { width: 52, height: 52, borderRadius: 12 },
  resultCopy: { flex: 1, minWidth: 0 },
  resultName: { fontFamily: theme.fontFamily.bodySemiBold, fontSize: 15, color: theme.colors.text },
  resultMeta: { fontFamily: theme.fontFamily.mono, fontSize: 11, color: theme.colors.textMedium, marginTop: 3 },
  resultMatch: { fontFamily: theme.fontFamily.bodySemiBold, fontSize: 11, color: theme.colors.linkGreen, marginTop: 4 },
  matchBadge: { minWidth: 46, paddingHorizontal: 8, paddingVertical: 5, borderWidth: 0.75, borderColor: "#BEE0CD", borderRadius: 8, backgroundColor: "#E7F3EC", alignItems: "center" },
  matchValue: { fontFamily: theme.fontFamily.monoBold, fontSize: 12, color: theme.colors.navy3 },
  matchLabel: { fontFamily: theme.fontFamily.mono, fontSize: 8, letterSpacing: 0.5, textTransform: "uppercase", color: theme.colors.navy3 },
});
