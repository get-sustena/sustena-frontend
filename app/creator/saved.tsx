import { Image } from "expo-image";
import { Href, router } from "expo-router";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AppText } from "../../src/components/ui/AppText";
import { Icon } from "../../src/components/ui/Icon";
import { ProgressLoader } from "../../src/components/ui/ProgressLoader";
import { useSavedCreatorsQuery } from "../../src/hooks/api/useCreators";
import { theme } from "../../src/theme/theme";
import { socialCopy } from "../../src/lib/socialCopy";

export default function SavedCreatorsScreen() {
  const insets = useSafeAreaInsets();
  const creatorsQuery = useSavedCreatorsQuery();
  const creators = creatorsQuery.data ?? [];

  return (
    <View style={styles.screen}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Pressable
          accessibilityLabel="Go back"
          onPress={() => router.back()}
          style={styles.headerButton}
        >
          <Icon name="chevronLeft" size={20} color={theme.colors.text} />
        </Pressable>
        <AppText style={styles.headerTitle}>{socialCopy.following}</AppText>
        <View style={styles.headerButton} />
      </View>

      {creatorsQuery.isLoading ? (
        <ProgressLoader variant="screen" />
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 36 }]}
        >
          {creators.length ? (
            creators.map((creator) => (
              <Pressable
                key={creator.id}
                onPress={() =>
                  router.push(
                    `/creators/${encodeURIComponent(creator.handle)}` as Href
                  )
                }
                style={({ pressed }) => [styles.creatorRow, pressed && styles.pressed]}
              >
                {creator.avatarUrl ? (
                  <Image source={{ uri: creator.avatarUrl }} contentFit="cover" style={styles.avatar} />
                ) : (
                  <View style={[styles.avatar, styles.avatarFallback]}>
                    <AppText style={styles.initials}>{getInitials(creator.displayName)}</AppText>
                  </View>
                )}
                <View style={styles.creatorCopy}>
                  <AppText style={styles.name}>{creator.displayName}</AppText>
                  <AppText style={styles.handle}>@{creator.handle}</AppText>
                  {creator.bio ? (
                    <AppText numberOfLines={1} style={styles.bio}>{creator.bio}</AppText>
                  ) : null}
                </View>
                <Icon name="chevronRight" size={17} color={theme.colors.textMuted} />
              </Pressable>
            ))
          ) : (
            <View style={styles.empty}>
              <View style={styles.emptyIcon}>
                <Icon name="bookmark" size={29} color={theme.colors.navy3} />
              </View>
              <AppText style={styles.emptyTitle}>No saved creators yet</AppText>
              <AppText style={styles.emptyCopy}>
                Save a creator from their public profile and they will appear here.
              </AppText>
            </View>
          )}
        </ScrollView>
      )}
    </View>
  );
}

function getInitials(value: string) {
  const parts = value.trim().split(/\s+/).filter(Boolean);
  return `${parts[0]?.[0] ?? "S"}${parts[1]?.[0] ?? ""}`.toUpperCase();
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.colors.background },
  header: { paddingHorizontal: 16, paddingBottom: 14, flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  headerButton: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  headerTitle: { fontFamily: theme.fontFamily.display, fontSize: 18, letterSpacing: -0.18, color: theme.colors.navy },
  content: { paddingHorizontal: 20, paddingTop: 20 },
  creatorRow: { minHeight: 88, paddingVertical: 12, flexDirection: "row", alignItems: "center", gap: 13, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  avatar: { width: 58, height: 58, borderRadius: 29 },
  avatarFallback: { alignItems: "center", justifyContent: "center", backgroundColor: theme.colors.surface2 },
  initials: { fontFamily: theme.fontFamily.display, fontSize: 18, color: theme.colors.navy },
  creatorCopy: { flex: 1 },
  name: { fontFamily: theme.fontFamily.bodySemiBold, fontSize: 15 },
  handle: { marginTop: 2, fontFamily: theme.fontFamily.body, fontSize: 10, color: theme.colors.textMuted },
  bio: { marginTop: 5, fontSize: 11, color: theme.colors.textMedium },
  empty: { paddingTop: 110, alignItems: "center" },
  emptyIcon: { width: 62, height: 62, alignItems: "center", justifyContent: "center", borderRadius: 31, backgroundColor: theme.colors.surface2 },
  emptyTitle: { marginTop: 15, fontFamily: theme.fontFamily.display, fontSize: 18, color: theme.colors.navy },
  emptyCopy: { maxWidth: 280, marginTop: 7, textAlign: "center", fontSize: 12, lineHeight: 18, color: theme.colors.textMuted },
  pressed: { opacity: 0.78 },
});
