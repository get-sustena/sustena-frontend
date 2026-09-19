// app/(tabs)/home.tsx

import { LinearGradient } from "expo-linear-gradient";
import { Image } from "expo-image";
import { router } from "expo-router";
import { useState } from "react";
import {
  LayoutChangeEvent,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, {
  Circle,
  Defs,
  Stop,
  RadialGradient as SvgRadialGradient,
} from "react-native-svg";
import {
  QuickRecipeCardsSkeleton,
  RecommendationCardSkeleton,
} from "../../src/components/home/HomeRecipeSkeletons";
import { NotificationsSheet } from "../../src/components/home/NotificationsSheet";
import { FeaturedRecipeCard } from "../../src/components/recipe/FeaturedRecipeCard";
import { RecipeCard } from "../../src/components/recipe/RecipeCard";
import { AppText } from "../../src/components/ui/AppText";
import { Icon } from "../../src/components/ui/Icon";
import { useRecipesWithLocalFallback } from "../../src/hooks/api/useRecipes";
import { useProfileAnswersQuery } from "../../src/hooks/api/useProfileAnswers";
import { useHomeRecommendations } from "../../src/hooks/api/useRecommendations";
import { apiRecipeToLocalRecipe } from "../../src/lib/api/adapters";
import { finiteTimeCap } from "../../src/lib/plannerQuickSetup";
import { useAuthStore } from "../../src/store/authStore";
import { useProfileAnswersStore } from "../../src/store/profileAnswersStore";
import { openSheet, showToast } from "../../src/store/uiStore";
import { theme } from "../../src/theme/theme";
import { appImages } from "../../src/assets/appImages";

const KITCHEN_QUICK_CATEGORIES = ["Proteins", "Produce", "Grains"];

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

function openPlanner(tab: "budget" | "kitchen", category?: string) {
  router.push({
    pathname: "/(tabs)/planner",
    params: category ? { tab, category } : { tab },
  });
}

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const nickname = useProfileAnswersStore((state) => state.nickname);
  const habitTime = useProfileAnswersStore((state) => state.habitTime);
  const experience = useProfileAnswersStore((state) => state.experience);
  const firstName = useAuthStore((state) => state.user?.firstName);
  useProfileAnswersQuery();
  const preferredTimeCap = finiteTimeCap(habitTime);
  const preferredDifficulty: "beginner" | "intermediate" | undefined =
    experience === "beginner" || experience === "intermediate"
      ? experience
      : undefined;
  const recommendationsQuery = useHomeRecommendations();
  const quickRecipesQuery = useRecipesWithLocalFallback({
    quickAndEasy: true,
    maxTotalTimeMinutes: Math.min(preferredTimeCap ?? 45, 45),
    preferredDifficulty,
    page: 1,
    pageSize: 12,
  });
  const recipes =
    recommendationsQuery.data?.items.map((item) =>
      apiRecipeToLocalRecipe(item.recipe)
    ) ?? [];
  const quickRecipeResults =
    quickRecipesQuery.data?.items.map(apiRecipeToLocalRecipe) ?? [];
  const [featuredIndex, setFeaturedIndex] = useState(0);
  const featuredRecipe = recipes[featuredIndex % Math.max(recipes.length, 1)];
  const quickRecipes = quickRecipeResults.filter(
    (recipe) =>
      recipe.totalTimeMinutes !== null &&
      recipe.totalTimeMinutes !== undefined &&
      recipe.totalTimeMinutes <= 45
  );

  const displayName = nickname?.trim() || firstName?.trim();
  const greeting = displayName
    ? `${getGreeting()}, ${displayName}`
    : getGreeting();

  return (
    <Animated.View entering={FadeInDown.duration(320)} style={styles.screen}>
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 44) }]}>
        <Pressable
          onPress={() => router.push("/(tabs)/profile")}
          accessibilityRole="button"
          accessibilityLabel="Open profile"
        >
          <AppText style={styles.greeting}>{greeting}</AppText>
        </Pressable>

        <Pressable
          onPress={() => openSheet(<NotificationsSheet />)}
          style={styles.notifButton}
          accessibilityRole="button"
          accessibilityLabel="Notifications"
        >
          <Icon name="notification" size={18} color={theme.colors.text} />
        </Pressable>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: Math.max(insets.bottom, 16) + 92 },
        ]}
      >
        <View style={styles.plannerSection}>
          <AppText style={[styles.sectionTitle, styles.plannerTitle]}>
            Smart Planner
          </AppText>

          <Pressable
            onPress={() => openPlanner("kitchen")}
            style={({ pressed }) => [
              styles.kitchenCardPressable,
              pressed && styles.pressed,
            ]}
            accessibilityRole="button"
            accessibilityLabel="Open What's in My Kitchen"
          >
            <View style={styles.kitchenCard}>
              <LinearGradient
                colors={["#1D3327", "#152119"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={StyleSheet.absoluteFill}
              />
              <Svg
                pointerEvents="none"
                width={240}
                height={240}
                style={styles.kitchenGlow}
              >
                <Defs>
                  <SvgRadialGradient id="kitchenGlow" cx="50%" cy="50%" r="50%">
                    <Stop offset="0%" stopColor="#40C982" stopOpacity={0.24} />
                    <Stop offset="72%" stopColor="#34B673" stopOpacity={0} />
                  </SvgRadialGradient>
                </Defs>
                <Circle cx={120} cy={120} r={120} fill="url(#kitchenGlow)" />
              </Svg>

              <Image
                source={appImages.home.kitchenPepper}
                contentFit="contain"
                pointerEvents="none"
                style={styles.kitchenPepper}
              />

              <View style={styles.kitchenContent}>
                <AppText style={styles.kitchenTitle}>
                  What&apos;s in My Kitchen?
                </AppText>
                <AppText style={styles.kitchenSubtitle}>
                  Tell us what you&apos;ve got, and we&apos;ll match it to
                  recipes you can cook right now.
                </AppText>

                <View style={styles.kitchenPillRow}>
                  {KITCHEN_QUICK_CATEGORIES.map((category) => (
                    <Pressable
                      key={category}
                      onPress={(event) => {
                        event.stopPropagation();
                        openPlanner("kitchen", category);
                      }}
                      style={({ pressed }) => [
                        styles.kitchenPill,
                        pressed && styles.kitchenPillPressed,
                      ]}
                      accessibilityRole="button"
                      accessibilityLabel={`Browse ${category.toLowerCase()}`}
                    >
                      <AppText style={styles.kitchenPillText}>
                        {category}
                      </AppText>
                    </Pressable>
                  ))}
                </View>
              </View>
            </View>
          </Pressable>

          <Pressable
            onPress={() => openPlanner("budget")}
            style={({ pressed }) => [
              styles.budgetRow,
              pressed && styles.pressed,
            ]}
            accessibilityRole="button"
            accessibilityLabel="Plan meals around a budget"
          >
            <Icon name="budget" size={15} color={theme.colors.textMedium} />
            <AppText style={styles.budgetRowText}>
              Or plan a full day of meals around your budget
            </AppText>
          </Pressable>
        </View>

        <View style={styles.recommendationSection}>
          <View style={styles.sectionHeaderRow}>
            <AppText style={styles.sectionTitle}>Our Recommendation</AppText>

            <Pressable
              onPress={() => {
                setFeaturedIndex((current) => current + 1);
                showToast("New pick found!");
              }}
              style={({ pressed }) => [
                styles.shuffleButton,
                pressed && styles.actionPressed,
              ]}
              disabled={recipes.length < 2}
              accessibilityRole="button"
              accessibilityLabel="Shuffle recommendation"
            >
              <Icon name="shuffle" size={15} color={theme.colors.linkGreen} />
              <AppText style={styles.shuffleText}>Shuffle</AppText>
            </Pressable>
          </View>

          {recommendationsQuery.isLoading ? (
            <RecommendationCardSkeleton />
          ) : featuredRecipe ? (
            <FeaturedRecipeCard
              recipe={featuredRecipe}
              onPress={() => openRecipe(featuredRecipe.id)}
            />
          ) : (
            <HomeSectionState
              title={
                recommendationsQuery.isError
                  ? "Recommendations unavailable"
                  : "No recipes ready"
              }
              message={
                recommendationsQuery.isError
                  ? "We couldn't load recipes right now."
                  : "Recipes will appear here once the library is ready."
              }
              onRetry={
                recommendationsQuery.isError
                  ? () => recommendationsQuery.refetch()
                  : undefined
              }
            />
          )}
        </View>

        <View style={styles.quickSection}>
          <View style={[styles.sectionHeaderRow, styles.quickHeaderRow]}>
            <AppText style={styles.sectionTitle}>Quick &amp; Easy</AppText>

            <Pressable
              onPress={() => router.push("/(tabs)/recipes")}
              style={({ pressed }) => pressed && styles.actionPressed}
              accessibilityRole="button"
              accessibilityLabel="See all recipes"
            >
              <AppText style={styles.seeAllText}>See all</AppText>
            </Pressable>
          </View>

          {quickRecipesQuery.isLoading ? (
            <QuickRecipeCardsSkeleton />
          ) : quickRecipes.length > 0 ? (
            <QuickCarousel recipes={quickRecipes} />
          ) : (
            <View style={styles.quickStateWrap}>
              <HomeSectionState
                title={
                  quickRecipesQuery.isError
                    ? "Quick recipes unavailable"
                    : "No quick recipes yet"
                }
                message={
                  quickRecipesQuery.isError
                    ? "We couldn't load quick recipes right now."
                    : "Recipes taking 45 minutes or less will show here."
                }
                onRetry={
                  quickRecipesQuery.isError
                    ? () => quickRecipesQuery.refetch()
                    : undefined
                }
              />
            </View>
          )}
        </View>
      </ScrollView>
    </Animated.View>
  );
}

function HomeSectionState({
  title,
  message,
  onRetry,
}: {
  title: string;
  message: string;
  onRetry?: () => void;
}) {
  return (
    <View style={styles.state}>
      <View style={styles.stateIcon}>
        <Icon name="cook" size={24} color={theme.colors.textMutedAlt} />
      </View>
      <AppText style={styles.stateTitle}>{title}</AppText>
      <AppText style={styles.stateMessage}>{message}</AppText>
      {onRetry ? (
        <Pressable
          onPress={onRetry}
          style={({ pressed }) => [
            styles.retryButton,
            pressed && styles.actionPressed,
          ]}
          accessibilityRole="button"
        >
          <AppText style={styles.retryText}>Try again</AppText>
        </Pressable>
      ) : null}
    </View>
  );
}

function QuickCarousel({
  recipes,
}: {
  recipes: ReturnType<typeof apiRecipeToLocalRecipe>[];
}) {
  const [containerWidth, setContainerWidth] = useState(0);
  const [contentWidth, setContentWidth] = useState(0);
  const [scrollX, setScrollX] = useState(0);

  const trackWidth = 120;
  const maxScroll = Math.max(contentWidth - containerWidth, 1);
  const thumbWidth = Math.min(
    trackWidth,
    Math.max(
      30,
      containerWidth > 0
        ? trackWidth * (containerWidth / Math.max(contentWidth, 1))
        : trackWidth * 0.4
    )
  );
  const thumbX =
    contentWidth > containerWidth
      ? (Math.min(scrollX, maxScroll) / maxScroll) * (trackWidth - thumbWidth)
      : 0;

  function handleLayout(event: LayoutChangeEvent) {
    setContainerWidth(event.nativeEvent.layout.width);
  }

  function handleScroll(event: NativeSyntheticEvent<NativeScrollEvent>) {
    setScrollX(Math.max(0, event.nativeEvent.contentOffset.x));
  }

  return (
    <View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        onLayout={handleLayout}
        onContentSizeChange={(width) => setContentWidth(width)}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        contentContainerStyle={styles.recipeScrollContent}
        decelerationRate="fast"
      >
        {recipes.map((recipe) => (
          <RecipeCard
            key={recipe.id}
            recipe={recipe}
            onPress={() => openRecipe(recipe.id)}
          />
        ))}
      </ScrollView>

      <View style={styles.scrollTrackWrap}>
        <View style={styles.scrollTrack}>
          <View
            style={[
              styles.scrollThumb,
              { width: thumbWidth, transform: [{ translateX: thumbX }] },
            ]}
          />
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
    paddingBottom: 6,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: theme.colors.white,
  },
  scrollContent: {
    backgroundColor: theme.colors.white,
  },
  greeting: {
    fontFamily: theme.fontFamily.bodySemiBold,
    fontSize: 15,
    color: theme.colors.navy,
  },
  notifButton: {
    width: 40,
    height: 40,
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
  notifDot: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: theme.colors.orange,
    borderWidth: 1.5,
    borderColor: theme.colors.card,
  },
  pressed: {
    opacity: 0.9,
    transform: [{ scale: 0.99 }],
  },
  actionPressed: {
    opacity: 0.65,
  },
  plannerSection: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 28,
  },
  recommendationSection: {
    paddingHorizontal: 20,
    paddingBottom: 28,
  },
  quickSection: {
    paddingBottom: 6,
  },
  sectionTitle: {
    fontFamily: theme.fontFamily.display,
    fontSize: 19,
    color: theme.colors.navy,
  },
  plannerTitle: {
    marginBottom: 12,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  quickHeaderRow: {
    paddingHorizontal: 20,
  },
  shuffleButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  shuffleText: {
    fontFamily: theme.fontFamily.bodySemiBold,
    fontSize: 12,
    color: theme.colors.linkGreen,
  },
  seeAllText: {
    fontFamily: theme.fontFamily.bodySemiBold,
    fontSize: 13,
    color: theme.colors.linkGreen,
  },
  kitchenCardPressable: {
    borderRadius: 20,
    marginBottom: 10,
    shadowColor: theme.colors.navy,
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.28,
    shadowRadius: 15,
    elevation: 6,
  },
  kitchenCard: {
    borderRadius: 20,
    padding: 20,
    overflow: "hidden",
  },
  kitchenGlow: {
    position: "absolute",
    top: -54,
    right: -42,
  },
  kitchenPepper: {
    position: "absolute",
    top: -8,
    right: -10,
    width: 118,
    height: 100,
    zIndex: 1,
  },
  kitchenContent: {
    position: "relative",
    zIndex: 1,
  },
  kitchenTitle: {
    fontFamily: theme.fontFamily.display,
    fontSize: 18,
    color: theme.colors.onDark,
    marginBottom: 4,
  },
  kitchenSubtitle: {
    fontFamily: theme.fontFamily.body,
    fontSize: 13,
    lineHeight: 19,
    color: "#9FB0A3",
    maxWidth: 240,
    marginBottom: 14,
  },
  kitchenPillRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  kitchenPill: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.16)",
    backgroundColor: "rgba(255,255,255,0.1)",
    paddingHorizontal: 13,
    paddingVertical: 8,
  },
  kitchenPillPressed: {
    backgroundColor: "rgba(255,255,255,0.18)",
    transform: [{ scale: 0.97 }],
  },
  kitchenPillText: {
    fontFamily: theme.fontFamily.monoBold,
    fontSize: 14,
    color: theme.colors.onDark,
  },
  budgetRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    paddingVertical: 11,
    paddingHorizontal: 4,
  },
  budgetRowText: {
    flex: 1,
    fontFamily: theme.fontFamily.bodySemiBold,
    fontSize: 13.5,
    color: theme.colors.navy,
  },
  recipeScrollContent: {
    gap: 14,
    paddingHorizontal: 20,
    paddingBottom: 10,
  },
  scrollTrackWrap: {
    alignItems: "center",
    paddingBottom: 8,
  },
  scrollTrack: {
    width: 120,
    height: 3,
    borderRadius: 999,
    backgroundColor: "#EDF2E3",
    overflow: "hidden",
  },
  scrollThumb: {
    height: "100%",
    borderRadius: 999,
    backgroundColor: theme.colors.border,
  },
  quickStateWrap: {
    paddingHorizontal: 20,
  },
  state: {
    minHeight: 180,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.card,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  stateIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: theme.colors.card2,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  stateTitle: {
    fontFamily: theme.fontFamily.bodySemiBold,
    fontSize: 14,
    color: theme.colors.navy,
    textAlign: "center",
    marginBottom: 4,
  },
  stateMessage: {
    fontFamily: theme.fontFamily.body,
    fontSize: 12.5,
    lineHeight: 18,
    color: theme.colors.textMuted,
    textAlign: "center",
  },
  retryButton: {
    marginTop: 12,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: theme.colors.navy,
  },
  retryText: {
    fontFamily: theme.fontFamily.bodySemiBold,
    fontSize: 12,
    color: theme.colors.onDark,
  },
});
