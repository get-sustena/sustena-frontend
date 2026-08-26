import { Image } from "expo-image";
import { Href, router } from "expo-router";
import { useMemo, useState } from "react";
import { LayoutChangeEvent, Pressable, ScrollView, Share, StyleSheet, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuthoringVocabularyQuery, useCreateRecipeDraftMutation, useMyRecipesQuery } from "../../hooks/api/useCreatorRecipes";
import { useMyCreatorProfileQuery } from "../../hooks/api/useCreators";
import { getApiErrorMessage } from "../../lib/api/errors";
import { suggestedCreatorHandle } from "../../lib/creators/profileDefaults";
import { createLocalId } from "../../lib/id";
import { useAuthStore } from "../../store/authStore";
import { closeSheet, openSheet, showToast } from "../../store/uiStore";
import { theme } from "../../theme/theme";
import type { RecipeDraft } from "../../types/api";
import { AppText } from "../ui/AppText";
import { Icon } from "../ui/Icon";
import { ProgressLoader } from "../ui/ProgressLoader";
import { CreatorProfileFiltersSheet, EMPTY_CREATOR_RECIPE_FILTERS, type CreatorRecipeFilters } from "./CreatorProfileFiltersSheet";
import { CreatorProfileRecipeCard } from "./CreatorProfileRecipeCard";
import { PublishingActivity } from "./PublishingActivity";
import { RecipeActionsSheet } from "./RecipeActionsSheet";

type Tab = "published" | "drafts";

export function CreatorProfileScreen() {
  const insets = useSafeAreaInsets();
  const user = useAuthStore((state) => state.user);
  const [tab, setTab] = useState<Tab>("published");
  const [searches, setSearches] = useState<Record<Tab, string>>({ published: "", drafts: "" });
  const [filtersByTab, setFiltersByTab] = useState<Record<Tab, CreatorRecipeFilters>>({ published: EMPTY_CREATOR_RECIPE_FILTERS, drafts: EMPTY_CREATOR_RECIPE_FILTERS });
  const [gridWidth, setGridWidth] = useState(0);
  const profileQuery = useMyCreatorProfileQuery();
  const savedProfile = profileQuery.data;
  const hasCreatorProfile = Boolean(savedProfile);
  const publishedQuery = useMyRecipesQuery({ status: "published", page: 1, pageSize: 500 }, hasCreatorProfile);
  const draftsQuery = useMyRecipesQuery({ status: "draft", page: 1, pageSize: 500 }, hasCreatorProfile);
  const vocabularyQuery = useAuthoringVocabularyQuery();
  const createMutation = useCreateRecipeDraftMutation();
  const displayName = savedProfile?.displayName || user?.fullName?.trim() || [user?.firstName, user?.lastName].filter(Boolean).join(" ") || "Sustena";
  const displayHandle = savedProfile?.handle || suggestedCreatorHandle(displayName, user?.email);
  const published = publishedQuery.data?.items ?? [];
  const drafts = draftsQuery.data?.items ?? [];
  const list = tab === "published" ? published : drafts;
  const activeRecipesQuery = tab === "published" ? publishedQuery : draftsQuery;
  const isRecipeListLoading =
    profileQuery.isLoading ||
    (hasCreatorProfile && activeRecipesQuery.isLoading);
  const search = searches[tab];
  const filters = filtersByTab[tab];
  const categoryLookup = useMemo(() => new Map((vocabularyQuery.data?.categories ?? []).map((item) => [item.id, item.label])), [vocabularyQuery.data?.categories]);
  const cuisineLookup = useMemo(() => new Map((vocabularyQuery.data?.cuisines ?? []).map((item) => [item.id, item.label])), [vocabularyQuery.data?.cuisines]);
  const categoryOptions = (vocabularyQuery.data?.categories ?? []).map((item) => item.label);
  const cuisineOptions = (vocabularyQuery.data?.cuisines ?? []).map((item) => item.label);
  const shown = useMemo(() => filterRecipes(list, search, filters, categoryLookup, cuisineLookup), [categoryLookup, cuisineLookup, filters, list, search]);

  async function createRecipe() {
    if (!savedProfile) {
      router.push("/creator/edit-profile" as Href);
      return;
    }
    try {
      const draft = await createMutation.mutateAsync({ id: createLocalId("recipe"), name: "", editorStage: 1 });
      router.push({
        pathname: "/creator/recipes/[id]",
        params: { id: draft.id, mode: "create" },
      });
    } catch (error) {
      showToast(getApiErrorMessage(error), "danger");
    }
  }

  function openFilters() {
    openSheet(
      <CreatorProfileFiltersSheet
        initialValue={filters}
        categories={categoryOptions}
        cuisines={cuisineOptions}
        resultCount={(value) => filterRecipes(list, search, value, categoryLookup, cuisineLookup).length}
        onApply={(value) => { setFiltersByTab((current) => ({ ...current, [tab]: value })); closeSheet(); }}
      />
    );
  }

  async function shareOwnProfile() {
    if (!savedProfile) {
      router.push("/creator/edit-profile" as Href);
      return;
    }
    const url = `https://sustena.app/@${savedProfile.handle}`;
    try {
      await Share.share({ title: savedProfile.displayName, message: url, url });
      showToast("Profile link copied", "success");
    } catch {
      showToast("We couldn’t share your profile. Try again.", "danger");
    }
  }

  return (
    <View style={styles.screen}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <AppText style={styles.headerTitle}>Profile</AppText>
        <View style={styles.headerActions}>
          <Pressable accessibilityLabel="Share profile" onPress={shareOwnProfile} style={styles.headerAction}><Icon name="share" size={19} color="#1f7048" /></Pressable>
          <Pressable accessibilityLabel="Open settings" onPress={() => router.push("/settings" as Href)} style={styles.headerAction}><Icon name="settings" size={19} color="#1f7048" /></Pressable>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.coverWrap}>
          {savedProfile?.coverUrl ? <Image source={{ uri: savedProfile.coverUrl }} contentFit="cover" style={styles.cover} /> : <View style={[styles.cover, styles.coverFallback]}><AppText style={styles.coverFallbackText}>Add a cover photo</AppText></View>}
          <View style={styles.avatarRing}>
            {savedProfile?.avatarUrl ? <Image source={{ uri: savedProfile.avatarUrl }} contentFit="cover" style={styles.avatar} /> : <View style={[styles.avatar, styles.avatarFallback]}><AppText style={styles.avatarInitials}>{initials(displayName)}</AppText></View>}
          </View>
        </View>

        <View style={styles.body}>
          <View style={styles.identityRow}>
            <View style={styles.identityCopy}><AppText style={styles.name}>{displayName}</AppText><AppText style={styles.handle}>@{displayHandle}</AppText></View>
            <Pressable onPress={() => router.push("/creator/edit-profile" as Href)} style={styles.editButton}><AppText style={styles.editText}>Edit profile</AppText></Pressable>
          </View>
          <View style={styles.stats}>
            <Stat value={String(published.length)} label="Recipes" />
            <View style={styles.divider} />
            <Stat value={compact(savedProfile?.totalRecipeSaves ?? 0)} label="Saves" />
            <View style={styles.divider} />
            <Stat value={savedProfile?.averageRating ? savedProfile.averageRating.toFixed(1) : "-"} label="Avg. rating" />
          </View>

          <View style={styles.activityHeader}><AppText style={styles.activityTitle}>Publishing activity</AppText><AppText style={styles.activityRange}>Last 10 weeks</AppText></View>
          <PublishingActivity recipes={published} />

          <Pressable disabled={createMutation.isPending} onPress={createRecipe} style={styles.createButton}><AppText style={styles.createText}>Create recipe</AppText></Pressable>

          <View style={styles.tabs}>
            <Pressable onPress={() => setTab("published")} style={[styles.tab, tab === "published" && styles.tabActive]}><AppText style={[styles.tabText, tab !== "published" && styles.tabTextMuted]}>Published</AppText></Pressable>
            <Pressable onPress={() => setTab("drafts")} style={[styles.tab, tab === "drafts" && styles.tabActive]}><AppText style={[styles.tabText, tab !== "drafts" && styles.tabTextMuted]}>Drafts</AppText></Pressable>
          </View>

          <View style={styles.searchRow}>
            <View style={styles.search}><Icon name="discover" size={16} color="#5C6459" /><TextInput value={search} onChangeText={(value) => setSearches((current) => ({ ...current, [tab]: value }))} accessibilityLabel="Search my recipes" placeholder="Search my recipes" placeholderTextColor="#9aa298" style={styles.searchInput} />{search ? <Pressable accessibilityLabel="Clear search" onPress={() => setSearches((current) => ({ ...current, [tab]: "" }))} style={styles.searchClear}><Icon name="close" size={10} color="#5C6459" strokeWidth={2} /></Pressable> : null}</View>
            <Pressable accessibilityLabel="Filter my recipes" onPress={openFilters} style={styles.filterButton}><Icon name="settings" size={19} color="#1f7048" /></Pressable>
          </View>

          {isRecipeListLoading ? (
            <ProgressLoader />
          ) : shown.length ? (
            <View
              style={styles.grid}
              onLayout={(event: LayoutChangeEvent) =>
                setGridWidth(event.nativeEvent.layout.width)
              }
            >
              {shown.map((recipe) => (
                <View
                  key={recipe.id}
                  style={[
                    styles.gridCard,
                    gridWidth > 0 ? { width: (gridWidth - 20) / 3 } : null,
                  ]}
                >
                  <CreatorProfileRecipeCard recipe={recipe} onPress={() => openRecipe(recipe, tab)} onMore={() => openSheet(<RecipeActionsSheet recipe={recipe} />)} />
                </View>
              ))}
            </View>
          ) : (
            <View style={styles.empty}>
              <View style={styles.emptyIcon}><Icon name="chefHat" size={26} color="#1f7048" /></View>
              <AppText style={styles.emptyTitle}>{list.length ? "No recipes found" : tab === "published" ? "Share your first recipe" : "No drafts yet"}</AppText>
              <AppText style={styles.emptyCopy}>{list.length ? "Try another search or clear your filters." : tab === "published" ? "Create a recipe to start building your public recipe page." : "Recipes you save before publishing will appear here."}</AppText>
              {list.length ? <View style={styles.emptyActions}><Pressable onPress={() => setFiltersByTab((current) => ({ ...current, [tab]: EMPTY_CREATOR_RECIPE_FILTERS }))} style={styles.emptySecondary}><AppText style={styles.emptySecondaryText}>Clear filters</AppText></Pressable><Pressable onPress={() => setSearches((current) => ({ ...current, [tab]: "" }))} style={styles.emptySecondary}><AppText style={styles.emptySecondaryText}>Clear search</AppText></Pressable></View> : <Pressable onPress={createRecipe} style={styles.emptyPrimary}><AppText style={styles.emptyPrimaryText}>Create recipe</AppText></Pressable>}
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return <View style={styles.stat}><AppText style={styles.statValue}>{value}</AppText><AppText style={styles.statLabel}>{label}</AppText></View>;
}

function filterRecipes(recipes: RecipeDraft[], search: string, filters: CreatorRecipeFilters, categories: Map<string, string>, cuisines: Map<string, string>) {
  const query = search.trim().toLowerCase();
  return recipes.filter((recipe) => {
    if (query && !`${recipe.name} ${recipe.description ?? ""}`.toLowerCase().includes(query)) return false;
    const recipeCategories = recipe.classifications.filter((item) => item.kind === "category").map((item) => categories.get(item.value) ?? item.value);
    const recipeCuisines = recipe.classifications.filter((item) => item.kind === "cuisine").map((item) => cuisines.get(item.value) ?? item.value);
    if (filters.categories.length && !recipeCategories.some((item) => filters.categories.includes(item))) return false;
    if (filters.cuisines.length && !recipeCuisines.some((item) => filters.cuisines.includes(item))) return false;
    if (filters.difficulties.length && (!recipe.difficulty || !filters.difficulties.some((item) => item.toLowerCase() === recipe.difficulty))) return false;
    const affordability = recipe.affordabilityBand === "low" ? "Low budget" : recipe.affordabilityBand === "moderate" ? "Moderate budget" : recipe.affordabilityBand === "expensive" ? "Expensive" : null;
    return !filters.affordability.length || Boolean(affordability && filters.affordability.includes(affordability));
  });
}

function openRecipe(recipe: RecipeDraft, tab: Tab) {
  if (tab === "published") {
    router.push({ pathname: "/recipes/[id]", params: { id: recipe.id } });
    return;
  }

  router.push(`/creator/recipes/${encodeURIComponent(recipe.id)}` as Href);
}

function initials(value: string) { return value.trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase(); }
function compact(value: number) { return value >= 1000 ? `${(value / 1000).toFixed(1)}k` : String(value); }

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#FBFCFA" },
  header: { paddingHorizontal: 20, paddingBottom: 8, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  headerTitle: { fontFamily: theme.fontFamily.display, fontSize: 20, color: "#17291E" },
  headerActions: { flexDirection: "row", gap: 8 },
  headerAction: { width: 42, height: 42, alignItems: "center", justifyContent: "center" },
  content: { paddingBottom: 120 },
  coverWrap: { position: "relative", marginBottom: 44 },
  cover: { width: "100%", height: 126, backgroundColor: "#EEF2E7" },
  coverFallback: { alignItems: "center", justifyContent: "center" },
  coverFallbackText: { fontFamily: theme.fontFamily.bodySemiBold, fontSize: 13, color: "#5C6459" },
  avatarRing: { position: "absolute", left: 20, bottom: -34, width: 80, height: 80, borderRadius: 40, borderWidth: 4, borderColor: "#FBFCFA", shadowColor: "#1B211C", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 3, overflow: "hidden" },
  avatar: { width: "100%", height: "100%" },
  avatarFallback: { backgroundColor: "#17291E", alignItems: "center", justifyContent: "center" },
  avatarInitials: { fontFamily: theme.fontFamily.bodySemiBold, fontSize: 24, color: "#FBFBF7" },
  body: { paddingHorizontal: 20 },
  identityRow: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 10, marginBottom: 10 },
  identityCopy: { flex: 1, minWidth: 0 },
  name: { marginBottom: 2, fontFamily: theme.fontFamily.display, fontSize: 19, color: "#17291E" },
  handle: { fontSize: 13.5, color: "#5C6459" },
  editButton: { minHeight: 44, paddingHorizontal: 18, borderRadius: 999, borderWidth: 1.5, borderColor: "#D8E3CA", backgroundColor: "#FFFFFF", alignItems: "center", justifyContent: "center" },
  editText: { fontFamily: theme.fontFamily.bodySemiBold, fontSize: 13, color: "#1B211C" },
  stats: { flexDirection: "row", alignItems: "stretch", marginBottom: 20 },
  stat: { flex: 1, alignItems: "center", paddingHorizontal: 4 },
  statValue: { fontFamily: theme.fontFamily.monoBold, fontSize: 19, color: "#17291E" },
  statLabel: { marginTop: 3, fontSize: 11, color: "#8a9187" },
  divider: { width: 1, backgroundColor: "#D8E3CA" },
  activityHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 7 },
  activityTitle: { fontFamily: theme.fontFamily.monoBold, fontSize: 11, letterSpacing: 1.1, textTransform: "uppercase", color: "#8a9187" },
  activityRange: { fontFamily: theme.fontFamily.mono, fontSize: 10.5, color: "#8a9187" },
  createButton: { marginBottom: 18, paddingVertical: 13, borderRadius: 999, backgroundColor: "#17291E", alignItems: "center" },
  createText: { fontFamily: theme.fontFamily.bodyBold, fontSize: 14, color: "#FBFBF7" },
  tabs: { flexDirection: "row", gap: 22, marginBottom: 14, borderBottomWidth: 1, borderBottomColor: "#D8E3CA" },
  tab: { paddingVertical: 10, borderBottomWidth: 2, borderBottomColor: "transparent" },
  tabActive: { borderBottomColor: "#17291E" },
  tabText: { fontFamily: theme.fontFamily.bodyBold, fontSize: 14, color: "#17291E" },
  tabTextMuted: { color: "#8a9187" },
  searchRow: { flexDirection: "row", gap: 8, marginBottom: 14 },
  search: { flex: 1, minHeight: 42, paddingHorizontal: 12, borderRadius: 12, borderWidth: 1, borderColor: "#D8E3CA", backgroundColor: "#FFFFFF", flexDirection: "row", alignItems: "center", gap: 8 },
  searchInput: { flex: 1, paddingVertical: 0, fontSize: 13.5, color: "#17291E" },
  searchClear: { width: 22, height: 22, borderRadius: 11, backgroundColor: "#EEF2E7", alignItems: "center", justifyContent: "center" },
  filterButton: { width: 42, height: 42, alignItems: "center", justifyContent: "center" },
  grid: { flexDirection: "row", flexWrap: "wrap", columnGap: 10, rowGap: 14 },
  gridCard: { width: "30%" },
  empty: { alignItems: "center", paddingHorizontal: 10, paddingVertical: 30 },
  emptyIcon: { width: 64, height: 64, marginBottom: 16, borderRadius: 20, backgroundColor: "#EEF2E7", alignItems: "center", justifyContent: "center" },
  emptyTitle: { marginBottom: 6, fontFamily: theme.fontFamily.display, fontSize: 18, textAlign: "center", color: "#17291E" },
  emptyCopy: { maxWidth: 230, marginBottom: 18, fontSize: 13.5, lineHeight: 20.25, textAlign: "center", color: "#5C6459" },
  emptyPrimary: { paddingHorizontal: 22, paddingVertical: 11, borderRadius: 999, backgroundColor: "#17291E" },
  emptyPrimaryText: { fontFamily: theme.fontFamily.bodySemiBold, fontSize: 14, color: "#FBFBF7" },
  emptyActions: { flexDirection: "row", gap: 8 },
  emptySecondary: { paddingHorizontal: 16, paddingVertical: 9, borderRadius: 999, borderWidth: 1, borderColor: "#D8E3CA", backgroundColor: "#FFFFFF" },
  emptySecondaryText: { fontFamily: theme.fontFamily.bodySemiBold, fontSize: 13, color: "#17291E" },
});
