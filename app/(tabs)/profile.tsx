// app/(tabs)/profile.tsx

import { router } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { StyleSheet, View } from "react-native";
import { FavoriteRecipeCard } from "../../src/components/profile/FavoriteRecipeCard";
import { SettingsRow } from "../../src/components/profile/SettingsRow";
import { AppText } from "../../src/components/ui/AppText";
import { Button } from "../../src/components/ui/Button";
import { Screen } from "../../src/components/ui/Screen";
import { ToggleSwitch } from "../../src/components/ui/ToggleSwitch";
import {
  getDietaryPreferenceLabel,
  getHealthConditionLabel,
} from "../../src/data/preferenceOptions";
import { Recipe } from "../../src/data/recipes";
import { getLocalRecipes } from "../../src/db/recipeRepository";
import { useQuery } from "@tanstack/react-query";
import { deleteFavoriteRecipe } from "../../src/db/favoritesRepository";
import { useLogoutMutation } from "../../src/hooks/api/useAuth";
import {
  useFavoritesQuery,
  useRemoveFavoriteMutation,
} from "../../src/hooks/api/useFavorites";
import {
  usePreferencesQuery,
  useUpdatePreferencesMutation,
} from "../../src/hooks/api/usePreferences";
import { apiFavoriteToRecipe } from "../../src/lib/api/adapters";
import { useFavoritesStore } from "../../src/store/favoritesStore";
import { useAuthStore } from "../../src/store/authStore";
import { usePreferencesStore } from "../../src/store/preferencesStore";
import { theme } from "../../src/theme/theme";

export default function ProfileScreen() {
  const db = useSQLiteContext();

  const favorites = useFavoritesStore((state) => state.favorites);
  const removeFavorite = useFavoritesStore((state) => state.removeFavorite);
  const user = useAuthStore((state) => state.user);
  const logoutMutation = useLogoutMutation();
  const favoritesQuery = useFavoritesQuery();
  const removeFavoriteMutation = useRemoveFavoriteMutation();
  const updatePreferencesMutation = useUpdatePreferencesMutation();
  usePreferencesQuery();
  const localRecipesQuery = useQuery({
    queryKey: ["recipes", "local-profile-favorites"] as const,
    queryFn: () => getLocalRecipes(db, { page: 1, pageSize: 500 }),
  });
  const localRecipes =
    localRecipesQuery.data?.items.map(apiFavoriteToRecipeLike).filter(Boolean) ??
    [];

  const localFavoriteRecipes = favorites
    .map((favorite) =>
      localRecipes.find((recipe) => recipe?.id === favorite.recipeId)
    )
    .filter((recipe): recipe is Recipe => Boolean(recipe));
  const apiFavoriteRecipes =
    favoritesQuery.data
      ?.map(apiFavoriteToRecipe)
      .filter((recipe): recipe is Recipe => Boolean(recipe)) ?? [];
  const favoriteRecipes =
    apiFavoriteRecipes.length > 0 ? apiFavoriteRecipes : localFavoriteRecipes;

  const healthConditions = usePreferencesStore(
    (state) => state.healthConditions
  );
  const dietaryPreference = usePreferencesStore(
    (state) => state.dietaryPreference
  );
  const defaultUnitMode = usePreferencesStore((state) => state.defaultUnitMode);
  const defaultServingSize = usePreferencesStore(
    (state) => state.defaultServingSize
  );
  const hapticsEnabled = usePreferencesStore((state) => state.hapticsEnabled);
  const dataSaverEnabled = usePreferencesStore(
    (state) => state.dataSaverEnabled
  );
  const mealRemindersEnabled = usePreferencesStore(
    (state) => state.mealRemindersEnabled
  );

  const setDefaultUnitMode = usePreferencesStore(
    (state) => state.setDefaultUnitMode
  );
  const setDefaultServingSize = usePreferencesStore(
    (state) => state.setDefaultServingSize
  );
  const toggleHaptics = usePreferencesStore((state) => state.toggleHaptics);
  const toggleDataSaver = usePreferencesStore((state) => state.toggleDataSaver);
  const toggleMealReminders = usePreferencesStore(
    (state) => state.toggleMealReminders
  );
  const resetPreferences = usePreferencesStore(
    (state) => state.resetPreferences
  );

  const healthLabel = healthConditions
    .map((condition) =>
      getHealthConditionLabel(condition).replace(/^[^\w]+ /, "")
    )
    .join(", ");

  const dietaryLabel = getDietaryPreferenceLabel(dietaryPreference).replace(
    /^[^\w]+ /,
    ""
  );

  function cycleUnitMode() {
    const nextUnitMode =
      defaultUnitMode === "metric"
        ? "cups"
        : defaultUnitMode === "cups"
          ? "imperial"
          : "metric";

    updatePreferencesMutation.mutate({
      healthConditions,
      dietaryPreference,
      defaultUnitMode: nextUnitMode,
      defaultServingSize,
    });

    if (defaultUnitMode === "metric") {
      setDefaultUnitMode("cups");
      return;
    }

    if (defaultUnitMode === "cups") {
      setDefaultUnitMode("imperial");
      return;
    }

    setDefaultUnitMode("metric");
  }

  function increaseServingSize() {
    const next = defaultServingSize >= 5 ? 1 : defaultServingSize + 1;
    updatePreferencesMutation.mutate({
      healthConditions,
      dietaryPreference,
      defaultUnitMode,
      defaultServingSize: next,
    });
    setDefaultServingSize(next);
  }

  async function handleRemoveFavorite(recipeId: string) {
    removeFavorite(recipeId);

    try {
      await removeFavoriteMutation.mutateAsync(recipeId);
      await deleteFavoriteRecipe(db, recipeId);
    } catch (error) {
      console.error("Failed to remove favorite", error);
    }
  }

  async function handleSignOut() {
    await logoutMutation.mutateAsync();
    router.replace("/welcome");
  }

  return (
    <Screen scroll>
      <View style={styles.hero}>
        <Decorations />

        <View style={styles.avatar}>
          <AppText style={styles.avatarEmoji}>👨🏾</AppText>
        </View>

        <AppText style={styles.name}>{user?.fullName ?? "CookEase User"}</AppText>
        <AppText style={styles.email}>{user?.email ?? "local-profile@cookease.app"}</AppText>

        <View style={styles.badges}>
          <View style={styles.badge}>
            <AppText style={styles.badgeText}>{dietaryLabel}</AppText>
          </View>

          <View style={styles.badge}>
            <AppText style={styles.badgeText}>
              {defaultServingSize}{" "}
              {defaultServingSize === 1 ? "person" : "people"}
            </AppText>
          </View>
        </View>
      </View>

      <View style={styles.offlineCard}>
        <AppText style={styles.offlineIcon}>📡</AppText>

        <View style={styles.offlineInfo}>
          <AppText style={styles.offlineTitle}>Offline Mode Ready</AppText>
          <AppText style={styles.offlineSub}>
            Recipes and shopping lists will work locally.
          </AppText>
        </View>

        <View style={styles.offlineStatus} />
      </View>

      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <AppText style={styles.statValue}>0</AppText>
          <AppText style={styles.statLabel}>Recipes Tried</AppText>
        </View>

        <View style={styles.statCard}>
          <AppText style={styles.statValueGreen}>{favoriteRecipes.length}</AppText>
          <AppText style={styles.statLabel}>Saved Recipes</AppText>
        </View>

        <View style={styles.statCard}>
          <AppText style={styles.statValueGold}>0</AppText>
          <AppText style={styles.statLabel}>GoLemon Orders</AppText>
        </View>
      </View>

      <View style={styles.section}>
        <AppText style={styles.sectionTitle}>Saved Recipes</AppText>

        <View style={styles.sectionCard}>
          {favoriteRecipes.length === 0 ? (
            <View style={styles.emptyFavorites}>
              <AppText style={styles.emptyFavoritesIcon}>♡</AppText>
              <AppText style={styles.emptyFavoritesTitle}>
                No saved recipes yet
              </AppText>
              <AppText style={styles.emptyFavoritesText}>
                Tap the heart on any recipe to save it here.
              </AppText>
            </View>
          ) : (
            favoriteRecipes.map((recipe) => (
              <FavoriteRecipeCard
                key={recipe.id}
                recipe={recipe}
                onRemove={handleRemoveFavorite}
              />
            ))
          )}
        </View>
      </View>

      <View style={styles.section}>
        <AppText style={styles.sectionTitle}>Preferences</AppText>

        <View style={styles.sectionCard}>
          <SettingsRow
            icon="💊"
            label="Health Conditions"
            subtitle="Used to filter suitable recipes"
            value={healthLabel}
          />

          <SettingsRow
            icon="🍽️"
            label="Dietary Style"
            subtitle="Affects recipe suggestions"
            value={dietaryLabel}
          />

          <SettingsRow
            icon="📏"
            label="Default Units"
            subtitle="Measurement preference"
            value={formatUnitMode(defaultUnitMode)}
            onPress={cycleUnitMode}
          />

          <SettingsRow
            icon="👥"
            label="Default Serving Size"
            subtitle="Pre-set for scaling"
            value={`${defaultServingSize} ${
              defaultServingSize === 1 ? "person" : "people"
            }`}
            onPress={increaseServingSize}
          />
        </View>
      </View>

      <View style={styles.section}>
        <AppText style={styles.sectionTitle}>App Settings</AppText>

        <View style={styles.sectionCard}>
          <SettingsRow
            icon="📳"
            label="Haptic Feedback"
            subtitle="Vibrate on interactions"
            rightElement={
              <ToggleSwitch value={hapticsEnabled} onChange={toggleHaptics} />
            }
          />

          <SettingsRow
            icon="🔔"
            label="Meal Reminders"
            subtitle="Daily push notifications"
            rightElement={
              <ToggleSwitch
                value={mealRemindersEnabled}
                onChange={toggleMealReminders}
              />
            }
          />

          <SettingsRow
            icon="📶"
            label="Data Saver Mode"
            subtitle="Reduces image quality on slow networks"
            rightElement={
              <ToggleSwitch
                value={dataSaverEnabled}
                onChange={toggleDataSaver}
              />
            }
          />
        </View>
      </View>

      <View style={styles.footer}>
        <Button
          title={logoutMutation.isPending ? "Signing out..." : "Sign Out"}
          variant="primary"
          onPress={handleSignOut}
          disabled={logoutMutation.isPending}
          style={styles.footerButton}
        />
        <Button
          title="Reset onboarding/preferences"
          variant="card"
          onPress={resetPreferences}
          style={styles.footerButton}
        />
      </View>
    </Screen>
  );
}

function Decorations() {
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <AppText style={[styles.deco, styles.decoChef]}>👨‍🍳</AppText>
      <AppText style={[styles.deco, styles.decoLeaf]}>🌿</AppText>
    </View>
  );
}

function apiFavoriteToRecipeLike(recipe: Parameters<typeof apiFavoriteToRecipe>[0]["recipe"]) {
  return recipe ? apiFavoriteToRecipe({ id: "", recipeId: recipe.id, createdAt: "", updatedAt: "", recipe }) : null;
}

function formatUnitMode(unitMode: string) {
  if (unitMode === "metric") return "Metric";
  if (unitMode === "cups") return "Cups/Tbsp";
  if (unitMode === "imperial") return "Imperial";

  return unitMode;
}

const styles = StyleSheet.create({
  hero: {
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 28,
    backgroundColor: theme.colors.navy,
    overflow: "hidden",
  },
  avatar: {
    width: 70,
    height: 70,
    borderRadius: 22,
    backgroundColor: theme.colors.orange,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: theme.spacing.md,
    zIndex: 1,
  },
  avatarEmoji: {
    fontSize: 28,
  },
  name: {
    fontFamily: theme.fontFamily.display,
    fontSize: 24,
    color: theme.colors.onDark,
    zIndex: 1,
  },
  email: {
    fontFamily: theme.fontFamily.body,
    fontSize: 12,
    color: theme.colors.onDark2,
    marginTop: 2,
    zIndex: 1,
  },
  badges: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.spacing.sm,
    marginTop: theme.spacing.lg,
    zIndex: 1,
  },
  badge: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 6,
    borderRadius: theme.radius.full,
    backgroundColor: "rgba(245,237,218,0.12)",
    borderWidth: 1,
    borderColor: "rgba(245,237,218,0.16)",
  },
  badgeText: {
    fontFamily: theme.fontFamily.bodyBold,
    fontSize: 11,
    color: theme.colors.orange2,
  },
  offlineCard: {
    marginHorizontal: 20,
    marginTop: theme.spacing.xl,
    marginBottom: theme.spacing.xl,
    padding: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.md,
  },
  offlineIcon: {
    fontSize: 20,
  },
  offlineInfo: {
    flex: 1,
  },
  offlineTitle: {
    fontFamily: theme.fontFamily.bodyBold,
    fontSize: 13,
    color: theme.colors.navy,
  },
  offlineSub: {
    fontFamily: theme.fontFamily.body,
    fontSize: 11,
    color: theme.colors.textMuted,
    marginTop: 2,
  },
  offlineStatus: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: theme.colors.green,
  },
  statsRow: {
    flexDirection: "row",
    gap: theme.spacing.sm,
    paddingHorizontal: 20,
    marginBottom: theme.spacing.xl,
  },
  statCard: {
    flex: 1,
    backgroundColor: theme.colors.surface,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    paddingVertical: 14,
    paddingHorizontal: 8,
    alignItems: "center",
  },
  statValue: {
    fontFamily: theme.fontFamily.display,
    fontSize: 22,
    color: theme.colors.orange,
  },
  statValueGreen: {
    fontFamily: theme.fontFamily.display,
    fontSize: 22,
    color: theme.colors.green,
  },
  statValueGold: {
    fontFamily: theme.fontFamily.display,
    fontSize: 22,
    color: theme.colors.gold,
  },
  statLabel: {
    fontFamily: theme.fontFamily.bodyBold,
    fontSize: 9,
    color: theme.colors.textMuted,
    textAlign: "center",
    marginTop: 3,
  },
  section: {
    paddingHorizontal: 20,
    marginBottom: theme.spacing.xl,
  },
  sectionTitle: {
    fontFamily: theme.fontFamily.bodyBold,
    fontSize: 10,
    color: theme.colors.textMuted,
    letterSpacing: 1.5,
    textTransform: "uppercase",
    marginBottom: theme.spacing.sm,
  },
  sectionCard: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.lg,
    paddingHorizontal: theme.spacing.md,
  },
  footer: {
    paddingHorizontal: 20,
    paddingBottom: theme.spacing["3xl"],
    gap: theme.spacing.md,
  },
  footerButton: {
    width: "100%",
  },
  deco: {
    position: "absolute",
    opacity: 0.1,
  },
  decoChef: {
    right: 24,
    top: 70,
    fontSize: 76,
    transform: [{ rotate: "10deg" }],
  },
  decoLeaf: {
    right: 90,
    bottom: 28,
    fontSize: 34,
    transform: [{ rotate: "-18deg" }],
  },
  emptyFavorites: {
    paddingVertical: theme.spacing["2xl"],
    alignItems: "center",
  },
  emptyFavoritesIcon: {
    fontSize: 34,
    color: theme.colors.textDim,
    marginBottom: theme.spacing.sm,
  },
  emptyFavoritesTitle: {
    fontFamily: theme.fontFamily.bodyBold,
    fontSize: 14,
    color: theme.colors.navy,
    marginBottom: 3,
  },
  emptyFavoritesText: {
    fontFamily: theme.fontFamily.body,
    fontSize: 12,
    color: theme.colors.textMuted,
    textAlign: "center",
  },
});
