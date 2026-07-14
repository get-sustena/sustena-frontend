import { router } from "expo-router";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { PlannerGoalCard } from "../../src/components/planner/PlannerGoalCard";
import { RecipeCard } from "../../src/components/recipe/RecipeCard";
import { AppText } from "../../src/components/ui/AppText";
import { EmptyState } from "../../src/components/ui/EmptyState";
import { Screen } from "../../src/components/ui/Screen";
import { SectionHeader } from "../../src/components/ui/SectionHeader";
import { useRecipesWithLocalFallback } from "../../src/hooks/api/useRecipes";
import { apiRecipeToLocalRecipe } from "../../src/lib/api/adapters";
import { theme } from "../../src/theme/theme";

function getGreeting() {
  const hour = new Date().getHours();

  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

function openRecipe(recipeId: string) {
  router.push({
    pathname: "/recipes/[id]",
    params: { id: recipeId },
  });
}

export default function HomeScreen() {
  const recipesQuery = useRecipesWithLocalFallback({ page: 1, pageSize: 24 });
  const quickRecipesQuery = useRecipesWithLocalFallback({
    quickAndEasy: true,
    maxTotalTimeMinutes: 45,
    page: 1,
    pageSize: 12,
  });
  const recipes = recipesQuery.data?.items.map(apiRecipeToLocalRecipe) ?? [];
  const quickRecipeResults =
    quickRecipesQuery.data?.items.map(apiRecipeToLocalRecipe) ?? [];
  const featuredRecipe = recipes[0];
  const quickRecipes = quickRecipeResults.filter(
    (recipe) =>
      recipe.totalTimeMinutes !== null &&
      recipe.totalTimeMinutes !== undefined &&
      recipe.totalTimeMinutes <= 45
  );

  return (
    <Screen scroll>
      <Decorations />

      <View style={styles.header}>
        <View>
          <AppText style={styles.eyebrow}>{getGreeting()}</AppText>
          <AppText style={styles.title}>
            What are we{"\n"}cooking today?
          </AppText>
        </View>

        <View style={styles.headerActions}>
          <Pressable style={styles.iconButton}>
            <AppText style={styles.iconText}>🔍</AppText>
          </Pressable>

          <Pressable style={styles.iconButton}>
            <AppText style={styles.iconText}>🔔</AppText>
            <View style={styles.notificationDot} />
          </Pressable>
        </View>
      </View>

      {/* <View style={styles.statusStrip}>
        <View style={styles.statusDot} />
        <AppText style={styles.statusText}>
          {recipesQuery.source === "local"
            ? "Offline fallback active · Local recipes ready"
            : "Recipes synced · Local recipes ready"}
        </AppText>
      </View> */}

      {/* <SectionHeader
        title="Today's Pick"
        actionLabel="See all →"
        onActionPress={() => router.push("/(tabs)/recipes")}
      />

      {featuredRecipe ? (
        <FeaturedRecipeCard
          recipe={featuredRecipe}
          onPress={() => openRecipe(featuredRecipe.id)}
        />
      ) : (
        <EmptyState
          icon="🍲"
          title="No recipes ready"
          message="Recipes will appear here once the library loads."
        />
      )} */}

      <SectionHeader title="Smart Planner" />

      <View style={styles.plannerGrid}>
        <View style={styles.plannerRow}>
          <PlannerGoalCard
            icon="💸"
            label="Budget"
            title="Cook on a Budget"
            onPress={() => router.push("/(tabs)/planner")}
          />

          <PlannerGoalCard
            icon="🥬"
            label="Inventory"
            title="What's in My Kitchen?"
            onPress={() => router.push("/(tabs)/planner")}
          />
        </View>
      </View>

      <SectionHeader
        title="Quick & Easy"
        actionLabel="Browse →"
        onActionPress={() => router.push("/(tabs)/recipes")}
      />

      {quickRecipes.length > 0 ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.recipeScrollContent}
        >
          {quickRecipes.map((recipe) => (
            <RecipeCard
              key={recipe.id}
              recipe={recipe}
              onPress={() => openRecipe(recipe.id)}
            />
          ))}
        </ScrollView>
      ) : (
        <EmptyState
          icon="⏱"
          title="No quick recipes yet"
          message="Recipes with a known total time of 45 minutes or less will show here."
        />
      )}
    </Screen>
  );
}

function Decorations() {
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <AppText style={[styles.deco, styles.decoHerb]}>🌿</AppText>
      <AppText style={[styles.deco, styles.decoPepper]}>🫑</AppText>
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
    lineHeight: 27,
    color: theme.colors.navy,
  },
  headerActions: {
    flexDirection: "row",
    gap: theme.spacing.sm,
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
    position: "relative",
  },
  iconText: {
    fontSize: 18,
  },
  notificationDot: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: theme.colors.orange,
    borderWidth: 2,
    borderColor: theme.colors.cream,
  },
  statusStrip: {
    marginHorizontal: 20,
    marginBottom: 18,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: theme.radius.sm,
    backgroundColor: theme.colors.greenDim,
    borderWidth: 1,
    borderColor: "rgba(42,125,79,0.2)",
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.sm,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: theme.colors.green,
  },
  statusText: {
    fontFamily: theme.fontFamily.bodySemiBold,
    fontSize: 11,
    color: theme.colors.green,
  },
  plannerGrid: {
    paddingHorizontal: 20,
    gap: 11,
    marginBottom: 26,
  },
  plannerRow: {
    flexDirection: "row",
    gap: 11,
  },
  recipeScrollContent: {
    paddingHorizontal: 20,
    gap: 12,
    paddingBottom: 28,
  },
  deco: {
    position: "absolute",
    opacity: 0.1,
  },
  decoHerb: {
    top: "8%",
    right: "4%",
    fontSize: 32,
    opacity: 0.12,
    transform: [{ rotate: "20deg" }],
  },
  decoPepper: {
    top: "40%",
    left: "2%",
    fontSize: 36,
    transform: [{ rotate: "-18deg" }],
  },
  decoTomato: {
    bottom: "20%",
    right: "12%",
    fontSize: 30,
  },
});
