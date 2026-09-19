import { Image } from "expo-image";
import { Href, router, useLocalSearchParams } from "expo-router";
import { useMemo, useState } from "react";
import { Pressable, ScrollView, Share, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuthoringVocabularyQuery } from "../../hooks/api/useCreatorRecipes";
import { useCreatorProfileQuery, useCreatorRecipesQuery, useSaveCreatorMutation } from "../../hooks/api/useCreators";
import { getApiErrorMessage } from "../../lib/api/errors";
import { closeSheet, openSheet, showToast } from "../../store/uiStore";
import { theme } from "../../theme/theme";
import { AppText } from "../ui/AppText";
import { Icon } from "../ui/Icon";
import { ProgressLoader } from "../ui/ProgressLoader";
import { CreatorCollectionsStrip, type CreatorRecipeCollection } from "./CreatorCollectionsStrip";
import { CreatorRecipeToolbar } from "./CreatorRecipeToolbar";
import { PublicCreatorRecipeTile } from "./PublicCreatorRecipeTile";
import { ReportCreatorSheet } from "./ReportCreatorSheet";
import { SortCreatorRecipesSheet, type CreatorRecipeSort } from "./SortCreatorRecipesSheet";

export function PublicCreatorProfileScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ handle: string }>();
  const handle = Array.isArray(params.handle) ? params.handle[0] : params.handle;
  const [sort, setSort] = useState<CreatorRecipeSort>("newest");
  const [collection, setCollection] = useState("");
  const [scrolled, setScrolled] = useState(false);
  const profileQuery = useCreatorProfileQuery(handle);
  const recipesQuery = useCreatorRecipesQuery(handle, { sort, page: 1, pageSize: 500 });
  const vocabularyQuery = useAuthoringVocabularyQuery();
  const saveMutation = useSaveCreatorMutation();
  const profile = profileQuery.data;
  const recipes = useMemo(() => recipesQuery.data?.items ?? [], [recipesQuery.data?.items]);
  const categories = useMemo(() => vocabularyQuery.data?.categories ?? [], [vocabularyQuery.data?.categories]);
  const categoryLabels = useMemo(() => new Map(categories.map((item) => [item.id, item.label])), [categories]);
  const specialityLabels = useMemo(() => new Map((vocabularyQuery.data?.cuisines ?? []).map((item) => [item.id, item.label])), [vocabularyQuery.data?.cuisines]);
  const collections = useMemo<CreatorRecipeCollection[]>(() => categories.map((category) => {
    const items = recipes.filter((recipe) => (recipe.categories ?? []).includes(category.id));
    return { id: category.id, label: category.label, count: items.length, coverUrl: items[0]?.imageUrl ?? null };
  }).filter((item) => item.count > 0), [categories, recipes]);
  const shown = collection ? recipes.filter((recipe) => (recipe.categories ?? []).includes(collection)) : recipes;

  async function toggleSavedCreator() {
    if (!profile || profile.isOwner) return;
    try {
      await saveMutation.mutateAsync({ creatorId: profile.id, save: !profile.isSaved });
      showToast(profile.isSaved ? "Removed from your creators" : `Saved ${profile.displayName}`, "success");
    } catch (error) {
      showToast(getApiErrorMessage(error), "danger");
    }
  }

  async function shareProfile() {
    if (!profile) return;
    const url = `https://sustena.app/@${profile.handle}`;
    try {
      await Share.share({ title: profile.displayName, message: url, url });
      showToast("Profile link copied", "success");
    } catch {
      showToast("We couldn’t share this profile. Try again.", "danger");
    }
  }

  function selectSort(value: CreatorRecipeSort) {
    setSort(value);
    closeSheet();
  }

  if (!profile) {
    return (
      <View style={[styles.screen, styles.loading]}>
        {profileQuery.isLoading ? <ProgressLoader variant="screen" /> : null}
      </View>
    );
  }
  return (
    <View style={styles.screen}>
      <View style={[styles.bar, scrolled && styles.barScrolled, { paddingTop: insets.top + 8 }]}>
        <Pressable accessibilityLabel="Go back" onPress={() => router.back()} style={styles.barButton}><Icon name="chevronLeft" size={20} /></Pressable>
        <AppText numberOfLines={1} style={[styles.barTitle, !scrolled && styles.barTitleHidden]}>{profile.displayName}</AppText>
        <Pressable accessibilityLabel="More options" onPress={() => openSheet(<ReportCreatorSheet creatorId={profile.id} />)} style={styles.barButton}><Icon name="moreH" size={19} /></Pressable>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} stickyHeaderIndices={recipes.length ? [collections.length > 1 ? 2 : 1] : undefined} onScroll={(event) => setScrolled(event.nativeEvent.contentOffset.y > 76)} scrollEventThrottle={16} contentContainerStyle={{ paddingBottom: insets.bottom + 44 }}>
        <View style={styles.profile}>
          <View style={styles.identity}>
            <View style={styles.avatar}>
              {profile.avatarUrl ? <Image source={{ uri: profile.avatarUrl }} contentFit="cover" style={StyleSheet.absoluteFill} /> : <AppText style={styles.initials}>{initials(profile.displayName)}</AppText>}
            </View>
            <View style={styles.identityCopy}>
              <View style={styles.nameRow}>
                <AppText style={styles.name}>{profile.displayName}</AppText>
                {profile.averageRating ? <View style={styles.rating}><Icon name="star" size={11} color="#E3A62E" filled /><AppText style={styles.ratingText}>{profile.averageRating.toFixed(1)}</AppText></View> : null}
              </View>
              <AppText style={styles.handle}>@{profile.handle}</AppText>
            </View>
          </View>
          {profile.bio ? <AppText style={styles.bio}>{profile.bio}</AppText> : null}
          {profile.specialities.length ? <View style={styles.specialities}>{profile.specialities.slice(0, 3).map((value) => <AppText key={value} style={styles.speciality}>{specialityLabels.get(value) ?? value}</AppText>)}</View> : null}
          <View style={styles.actions}>
            {profile.isOwner ? (
              <Pressable onPress={() => router.push("/creator/edit-profile" as Href)} style={[styles.saveButton, styles.ownerButton]}><Icon name="pencil" size={16} /><AppText style={styles.ownerButtonText}>Edit profile</AppText></Pressable>
            ) : (
              <Pressable disabled={saveMutation.isPending} onPress={toggleSavedCreator} style={[styles.saveButton, profile.isSaved && styles.savedButton]}>{profile.isSaved ? <Icon name="check" size={17} color="#1f7048" strokeWidth={2.2} /> : <Icon name="bookmark" size={16} color="#FBFBF7" />}<AppText style={[styles.saveButtonText, profile.isSaved && styles.savedButtonText]}>{profile.isSaved ? "Saved" : "Save creator"}</AppText></Pressable>
            )}
            <Pressable accessibilityLabel="Share profile" onPress={shareProfile} style={styles.shareButton}><Icon name="share" size={18} /></Pressable>
          </View>
        </View>

        {collections.length > 1 ? <CreatorCollectionsStrip collections={collections} selected={collection} onSelect={(value) => setCollection((current) => current === value ? "" : value)} /> : null}

        {recipes.length ? (
          <CreatorRecipeToolbar
            title={collection ? categoryLabels.get(collection) ?? collection : "All recipes"}
            count={shown.length}
            sort={sort}
            showSort={shown.length >= 4}
            onOpenSort={() => openSheet(<SortCreatorRecipesSheet value={sort} onSelect={selectSort} />)}
          />
        ) : null}

        {recipesQuery.isLoading ? (
          <View style={styles.recipeLoading}>
            <ProgressLoader />
          </View>
        ) : shown.length ? (
          <View style={styles.grid}>
            {shown.map((recipe) => (
              <View key={recipe.id} style={styles.gridItem}>
                <PublicCreatorRecipeTile recipe={recipe} onPress={() => router.push({ pathname: "/recipes/[id]", params: { id: recipe.id } })} />
              </View>
            ))}
          </View>
        ) : (
          <View style={styles.empty}>
            <View style={styles.emptyIcon}><Icon name="chefHat" size={25} color="#1f7048" /></View>
            <AppText style={styles.emptyTitle}>No recipes yet</AppText>
            <AppText style={styles.emptyCopy}>When {profile.displayName} publishes a recipe, it will show up here.</AppText>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

function initials(value: string) { return value.trim().split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase(); }

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#FBFCFA" },
  loading: { alignItems: "center", justifyContent: "center" },
  bar: { paddingHorizontal: 10, paddingBottom: 8, flexDirection: "row", alignItems: "center", gap: 4, borderBottomWidth: 1, borderBottomColor: "transparent", backgroundColor: "#FBFCFA", zIndex: 4 },
  barScrolled: { borderBottomColor: "#E3EAD5" },
  barButton: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  barTitle: { flex: 1, fontFamily: theme.fontFamily.bodySemiBold, fontSize: 15.5, color: "#17291E" },
  barTitleHidden: { opacity: 0 },
  profile: { paddingHorizontal: 20, paddingTop: 4 },
  identity: { flexDirection: "row", alignItems: "center", gap: 16, marginBottom: 14 },
  avatar: { width: 82, height: 82, borderRadius: 41, overflow: "hidden", backgroundColor: "#17291E", alignItems: "center", justifyContent: "center" },
  initials: { fontFamily: theme.fontFamily.bodySemiBold, fontSize: 27, color: "#FBFBF7" },
  identityCopy: { flex: 1, minWidth: 0 },
  nameRow: { flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 2 },
  name: { fontFamily: theme.fontFamily.display, fontSize: 23, lineHeight: 26.45, letterSpacing: -0.46, color: "#17291E" },
  rating: { flexDirection: "row", alignItems: "center", gap: 4 },
  ratingText: { fontFamily: theme.fontFamily.monoBold, fontSize: 12, color: "#17291E" },
  handle: { fontSize: 14, color: "#5C6459" },
  bio: { marginBottom: 10, fontSize: 14.5, lineHeight: 21.75, color: "#1B211C" },
  specialities: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 16 },
  speciality: { paddingHorizontal: 11, paddingVertical: 5, borderRadius: 999, borderWidth: 1, borderColor: "#E1E1E1", backgroundColor: "#EEF2E7", fontFamily: theme.fontFamily.bodySemiBold, fontSize: 12, color: "#1f7048" },
  actions: { flexDirection: "row", gap: 10 },
  saveButton: { flex: 1, minHeight: 46, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, borderRadius: 999, borderWidth: 1, borderColor: "#17291E", backgroundColor: "#17291E" },
  saveButtonText: { fontFamily: theme.fontFamily.bodySemiBold, fontSize: 14.5, color: "#FBFBF7" },
  savedButton: { borderColor: "#E1E1E1", backgroundColor: "#FFFFFF" },
  savedButtonText: { color: "#17291E" },
  ownerButton: { borderColor: "#E1E1E1", backgroundColor: "#FFFFFF" },
  ownerButtonText: { fontFamily: theme.fontFamily.bodySemiBold, fontSize: 14.5, color: "#17291E" },
  shareButton: { width: 46, height: 46, borderRadius: 23, borderWidth: 1, borderColor: "#E1E1E1", backgroundColor: "#FFFFFF", alignItems: "center", justifyContent: "center" },
  grid: { width: "100%", flexDirection: "row", flexWrap: "wrap" },
  gridItem: { width: "33.333333%", padding: 1 },
  recipeLoading: { minHeight: 180, alignItems: "center", justifyContent: "center" },
  empty: { alignItems: "center", paddingHorizontal: 24, paddingTop: 34 },
  emptyIcon: { width: 60, height: 60, marginBottom: 16, borderRadius: 20, backgroundColor: "#EEF2E7", alignItems: "center", justifyContent: "center" },
  emptyTitle: { marginBottom: 6, fontFamily: theme.fontFamily.display, fontSize: 18, textAlign: "center", color: "#17291E" },
  emptyCopy: { maxWidth: 240, fontSize: 13.5, lineHeight: 20.25, textAlign: "center", color: "#5C6459" },
});
