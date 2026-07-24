// app/saved-recipes.tsx
// Standalone saved-recipes grid, reached via the bookmark button on the
// Recipes tab — mirrors the mockup's separate "saved-recipes" screen.
// Reuses the same favorites data/removal logic as the Profile tab's Saved
// Recipes section (see src/hooks/useFavoriteRecipes.ts).

import { router } from "expo-router";
import { FlatList, Pressable, StyleSheet, View } from "react-native";
import { RecipeTile } from "../src/components/recipe/RecipeTile";
import { AppText } from "../src/components/ui/AppText";
import { Button } from "../src/components/ui/Button";
import { Icon } from "../src/components/ui/Icon";
import { Screen } from "../src/components/ui/Screen";
import { useFavoriteRecipes } from "../src/hooks/useFavoriteRecipes";
import { theme } from "../src/theme/theme";

export default function SavedRecipesScreen() {
  const { favoriteRecipes } = useFavoriteRecipes();

  return (
    <Screen>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.headerButton}>
          <Icon name="chevronLeft" size={19} color={theme.colors.text} />
        </Pressable>

        <AppText style={styles.headerTitle}>Saved Recipes</AppText>

        <View style={styles.headerButton} />
      </View>

      <FlatList
        data={favoriteRecipes}
        keyExtractor={(item) => item.id}
        numColumns={2}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.gridContent,
          favoriteRecipes.length === 0 && styles.emptyGridContent,
        ]}
        columnWrapperStyle={
          favoriteRecipes.length > 0 ? styles.columnWrapper : undefined
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
          <View style={styles.empty}>
            <View style={styles.emptyIconWrap}>
              <Icon name="bookmark" size={26} color={theme.colors.linkGreen} />
            </View>

            <AppText style={styles.emptyTitle}>No saved recipes yet</AppText>
            <AppText style={styles.emptyText}>
              Tap the bookmark on any recipe to save it here for later.
            </AppText>

            <Button
              title="Browse Recipes"
              onPress={() => router.push("/(tabs)/recipes")}
            />
          </View>
        }
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 20,
    paddingTop: 52,
    paddingBottom: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerButton: {
    width: 44,
    height: 44,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.card,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontFamily: theme.fontFamily.display,
    fontSize: 18,
    letterSpacing: -0.2,
    color: theme.colors.navy,
  },
  gridContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  emptyGridContent: {
    flexGrow: 1,
    justifyContent: "center",
  },
  columnWrapper: {
    gap: 12,
    marginBottom: 12,
  },
  empty: {
    alignItems: "center",
    textAlign: "center",
    paddingHorizontal: 24,
    paddingTop: 60,
  },
  emptyIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: theme.colors.card2,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 18,
  },
  emptyTitle: {
    fontFamily: theme.fontFamily.display,
    fontSize: 19,
    color: theme.colors.navy,
    marginBottom: 8,
  },
  emptyText: {
    fontFamily: theme.fontFamily.body,
    fontSize: 14,
    lineHeight: 21,
    color: theme.colors.textMedium,
    textAlign: "center",
    maxWidth: 230,
    marginBottom: 22,
  },
});
