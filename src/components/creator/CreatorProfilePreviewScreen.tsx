import { Image } from "expo-image";
import { router } from "expo-router";
import { useMemo, useState } from "react";
import { Pressable, ScrollView, Share, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuthoringVocabularyQuery } from "../../hooks/api/useCreatorRecipes";
import { useCreatorRecipesQuery, useMyCreatorProfileQuery } from "../../hooks/api/useCreators";
import { useRecordActivity } from "../../hooks/useActivity";
import { useCreatorProfileEditStore } from "../../store/creatorProfileEditStore";
import { closeSheet, openSheet, showToast } from "../../store/uiStore";
import { theme } from "../../theme/theme";
import { AppText } from "../ui/AppText";
import { Icon } from "../ui/Icon";
import { CreatorCollectionsStrip, type CreatorRecipeCollection } from "./CreatorCollectionsStrip";
import { CreatorRecipeToolbar } from "./CreatorRecipeToolbar";
import { openRecipe } from "../../lib/navigation/openRecipe";
import { PublicCreatorRecipeTile } from "./PublicCreatorRecipeTile";
import { ReportCreatorSheet } from "./ReportCreatorSheet";
import { SortCreatorRecipesSheet, type CreatorRecipeSort } from "./SortCreatorRecipesSheet";

export function CreatorProfilePreviewScreen() {
  const insets = useSafeAreaInsets();
  const draft = useCreatorProfileEditStore();
  const currentProfile = useMyCreatorProfileQuery().data;
  const recordActivity = useRecordActivity();
  const [sort, setSort] = useState<CreatorRecipeSort>("newest");
  const [collection, setCollection] = useState("");
  const [scrolled, setScrolled] = useState(false);
  const recipeItems = useCreatorRecipesQuery(currentProfile?.handle, { sort, page: 1, pageSize: 500 }).data?.items;
  const recipes = useMemo(() => recipeItems ?? [], [recipeItems]);
  const vocabulary = useAuthoringVocabularyQuery().data;
  const categoryLabels = useMemo(() => new Map((vocabulary?.categories ?? []).map((item) => [item.id, item.label])), [vocabulary?.categories]);
  const specialityLabels = useMemo(() => new Map((vocabulary?.cuisines ?? []).map((item) => [item.id, item.label])), [vocabulary?.cuisines]);
  const collections = useMemo<CreatorRecipeCollection[]>(() => (vocabulary?.categories ?? []).map((category) => {
    const items = recipes.filter((recipe) => (recipe.categories ?? []).includes(category.id));
    return { id: category.id, label: category.label, count: items.length, coverUrl: items[0]?.imageUrl ?? null };
  }).filter((item) => item.count > 0), [recipes, vocabulary?.categories]);
  const shown = collection ? recipes.filter((recipe) => (recipe.categories ?? []).includes(collection)) : recipes;

  async function shareProfile() {
    const url = `https://sustena.app/@${draft.handle}`;
    try {
      const result = await Share.share({ title: draft.displayName, message: url, url });
      if (result.action !== Share.dismissedAction && currentProfile) {
        recordActivity({ type: "creator_profile_shared", properties: { creatorProfileId: currentProfile.id } });
      }
      showToast("Profile link copied", "success");
    } catch {
      showToast("We couldn’t share this profile. Try again.", "danger");
    }
  }

  return (
    <View style={styles.screen}>
      <View style={[styles.bar, scrolled && styles.barScrolled, { paddingTop: insets.top + 8 }]}>
        <Pressable accessibilityLabel="Go back" onPress={() => router.back()} style={styles.barButton}><Icon name="chevronLeft" size={20} /></Pressable>
        <AppText numberOfLines={1} style={[styles.barTitle, !scrolled && styles.barTitleHidden]}>{draft.displayName}</AppText>
        {currentProfile ? <Pressable accessibilityLabel="More options" onPress={() => openSheet(<ReportCreatorSheet creatorId={currentProfile.id} />)} style={styles.barButton}><Icon name="moreH" size={19} /></Pressable> : <View style={styles.barButton} />}
      </View>

      <ScrollView showsVerticalScrollIndicator={false} stickyHeaderIndices={recipes.length ? [collections.length > 1 ? 2 : 1] : undefined} onScroll={(event) => setScrolled(event.nativeEvent.contentOffset.y > 76)} scrollEventThrottle={16} contentContainerStyle={{ paddingBottom: insets.bottom + 44 }}>
        <View style={styles.profile}>
          <View style={styles.identity}>
            <View style={styles.avatar}>{draft.avatarUrl ? <Image source={{ uri: draft.avatarUrl }} contentFit="cover" style={StyleSheet.absoluteFill} /> : <AppText style={styles.initials}>{initials(draft.displayName)}</AppText>}</View>
            <View style={styles.identityCopy}><AppText style={styles.name}>{draft.displayName}</AppText><AppText style={styles.handle}>@{draft.handle}</AppText></View>
          </View>
          {draft.bio ? <AppText style={styles.bio}>{draft.bio}</AppText> : null}
          {draft.specialities.length ? <View style={styles.specialities}>{draft.specialities.slice(0, 3).map((value) => <AppText key={value} style={styles.speciality}>{specialityLabels.get(value) ?? value}</AppText>)}</View> : null}
          <View style={styles.actions}>
            <View style={styles.previewNotice}><AppText style={styles.previewNoticeText}>This is how others see your profile</AppText></View>
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
            onOpenSort={() => openSheet(<SortCreatorRecipesSheet value={sort} onSelect={(value) => { setSort(value); closeSheet(); }} />)}
          />
        ) : null}

        {recipes.length ? <View style={styles.grid}>{shown.map((recipe) => <View key={recipe.id} style={styles.gridItem}><PublicCreatorRecipeTile recipe={recipe} onPress={() => openRecipe(recipe.id, "creator_profile")} /></View>)}</View> : (
          <View style={styles.empty}><View style={styles.emptyIcon}><Icon name="chefHat" size={25} color="#1f7048" /></View><AppText style={styles.emptyTitle}>No recipes yet</AppText><AppText style={styles.emptyCopy}>When {draft.displayName || "this creator"} publishes a recipe, it will show up here.</AppText></View>
        )}
      </ScrollView>
    </View>
  );
}

function initials(value: string) { return value.trim().split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase(); }

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.colors.page },
  bar: { paddingHorizontal: 10, paddingBottom: 8, flexDirection: "row", alignItems: "center", gap: 4, borderBottomWidth: 1, borderBottomColor: "transparent", backgroundColor: theme.colors.page, zIndex: 4 },
  barScrolled: { borderBottomColor: "#E3EAD5" },
  barButton: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  barTitle: { flex: 1, fontFamily: theme.fontFamily.bodySemiBold, fontSize: 15.5, color: "#17291E" },
  barTitleHidden: { opacity: 0 },
  profile: { paddingHorizontal: 20, paddingTop: 4 },
  identity: { flexDirection: "row", alignItems: "center", gap: 16, marginBottom: 14 },
  avatar: { width: 82, height: 82, borderRadius: 41, overflow: "hidden", backgroundColor: "#17291E", alignItems: "center", justifyContent: "center" },
  initials: { fontFamily: theme.fontFamily.bodySemiBold, fontSize: 27, color: "#FBFBF7" },
  identityCopy: { flex: 1, minWidth: 0 },
  name: { marginBottom: 2, fontFamily: theme.fontFamily.display, fontSize: 23, lineHeight: 26.45, letterSpacing: -0.46, color: "#17291E" },
  handle: { fontSize: 14, color: "#5C6459" },
  bio: { marginBottom: 10, fontSize: 14.5, lineHeight: 21.75, color: "#1B211C" },
  specialities: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 16 },
  speciality: { paddingHorizontal: 11, paddingVertical: 5, borderRadius: 999, borderWidth: 1, borderColor: "#E1E1E1", backgroundColor: "#EEF2E7", fontFamily: theme.fontFamily.bodySemiBold, fontSize: 12, color: "#1f7048" },
  actions: { flexDirection: "row", gap: 10 },
  previewNotice: { flex: 1, minHeight: 46, alignItems: "center", justifyContent: "center", borderRadius: 999, borderWidth: 1, borderColor: "#E3EAD5", backgroundColor: "#F3F6EC" },
  previewNoticeText: { fontSize: 13.5, color: "#5C6459" },
  shareButton: { width: 46, height: 46, borderRadius: 23, borderWidth: 1, borderColor: "#E1E1E1", backgroundColor: "#FFFFFF", alignItems: "center", justifyContent: "center" },
  grid: { width: "100%", flexDirection: "row", flexWrap: "wrap" },
  gridItem: { width: "33.333333%", padding: 1 },
  empty: { alignItems: "center", paddingHorizontal: 24, paddingTop: 34 },
  emptyIcon: { width: 60, height: 60, marginBottom: 16, borderRadius: 20, backgroundColor: "#EEF2E7", alignItems: "center", justifyContent: "center" },
  emptyTitle: { marginBottom: 6, fontFamily: theme.fontFamily.display, fontSize: 18, textAlign: "center", color: "#17291E" },
  emptyCopy: { maxWidth: 240, fontSize: 13.5, lineHeight: 20.25, textAlign: "center", color: "#5C6459" },
});
