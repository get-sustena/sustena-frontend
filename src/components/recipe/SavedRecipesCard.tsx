import { router } from "expo-router";
import { Pressable, StyleSheet, View } from "react-native";
import { socialCopy } from "../../lib/socialCopy";
import { useFavoritesStore } from "../../store/favoritesStore";
import { theme } from "../../theme/theme";
import { AppText } from "../ui/AppText";
import { Icon } from "../ui/Icon";

// View saved recipes, under the search on the Recipes tab (PRD v6.9 section
// 20, B). It shows when nothing is saved too. The count is on the phone, so
// there's nothing to load.
export function SavedRecipesCard() {
  const count = useFavoritesStore((state) => state.favorites.length);

  return (
    <Pressable
      onPress={() => router.push("/saved-recipes")}
      accessibilityRole="button"
      style={({ pressed, hovered }) => [styles.card, hovered && styles.hovered, pressed && styles.pressed]}
    >
      <View style={styles.icon}>
        <Icon name="bookmark" size={18} color={theme.colors.navy3} />
      </View>
      <View style={styles.copy}>
        <AppText style={styles.title}>{socialCopy.viewSavedRecipes}</AppText>
        <AppText style={styles.subtitle}>
          {count ? socialCopy.savedCount(count) : socialCopy.nothingSaved}
        </AppText>
      </View>
      <Icon name="chevronRight" size={18} color={theme.colors.textMedium} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginHorizontal: 20,
    marginBottom: 16,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: 0.75,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  hovered: { backgroundColor: "rgba(23,41,30,0.05)" },
  pressed: { transform: [{ scale: 0.98 }] },
  icon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: theme.colors.cream2,
    alignItems: "center",
    justifyContent: "center",
  },
  copy: { flex: 1, minWidth: 0, gap: 2 },
  title: {
    fontFamily: theme.fontFamily.bodySemiBold,
    fontSize: 14.5,
    lineHeight: 14.5 * 1.25,
    color: theme.colors.navy,
  },
  subtitle: {
    fontSize: 12.5,
    lineHeight: 12.5 * 1.3,
    color: theme.colors.textMedium,
  },
});
