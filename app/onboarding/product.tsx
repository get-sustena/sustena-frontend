import { router } from "expo-router";
import { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { AppText } from "../../src/components/ui/AppText";
import { Button } from "../../src/components/ui/Button";
import { usePreferencesStore } from "../../src/store/preferencesStore";
import { theme } from "../../src/theme/theme";

const SLIDES = [
  {
    title: "Plan Your Day\nOn Any Budget",
    description:
      "Enter your daily budget and CookEase instantly generates a full breakfast, lunch and dinner plan — all within what you can afford.",
    visual: "budget",
  },
  {
    title: "Nigerian & Continental\nRecipes",
    description:
      "From Jollof Rice to Fisherman Soup, scale any recipe for 1–25 people and convert measurements between grams, cups, or ounces.",
    visual: "recipes",
  },
  {
    title: "Switch Units\nPer Ingredient",
    description:
      "Toggle measurement units individually for each ingredient. Rice in cups, oil in tablespoons, meat in grams — all at the same time.",
    visual: "units",
  },
  {
    title: "One Tap to\nYour Doorstep",
    description:
      "Ingredients fly from your recipe into a smart shopping list. Tick what you have, order the rest via GoLemon — delivered to your door.",
    visual: "shopping",
  },
] as const;

export default function ProductOnboardingScreen() {
  const [index, setIndex] = useState(0);
  const completeOnboarding = usePreferencesStore(
    (state) => state.completeOnboarding
  );

  const slide = SLIDES[index];
  const isLast = index === SLIDES.length - 1;

  function finish() {
    completeOnboarding();
    router.replace("/(tabs)/home");
  }

  function next() {
    if (isLast) {
      finish();
      return;
    }

    setIndex((current) => current + 1);
  }

  function back() {
    setIndex((current) => Math.max(0, current - 1));
  }

  return (
    <View style={styles.screen}>
      <Decorations />

      <View style={styles.header}>
        <Pressable onPress={finish}>
          <AppText style={styles.skip}>Skip</AppText>
        </Pressable>
      </View>

      <View style={styles.slide}>
        <View style={styles.visualWrap}>
          <OnboardingVisual type={slide.visual} />
        </View>

        <AppText style={styles.title}>{slide.title}</AppText>
        <AppText style={styles.description}>{slide.description}</AppText>
      </View>

      <View style={styles.footer}>
        <View style={styles.dots}>
          {SLIDES.map((_, dotIndex) => (
            <View
              key={dotIndex}
              style={[styles.dot, dotIndex === index && styles.activeDot]}
            />
          ))}
        </View>

        <View style={styles.actions}>
          {index > 0 ? (
            <Button title="← Back" variant="outline" onPress={back} />
          ) : null}

          <Button
            title={isLast ? "Let’s Cook! 🍲" : "Next →"}
            variant="accent"
            onPress={next}
            style={styles.nextButton}
          />
        </View>
      </View>
    </View>
  );
}

function OnboardingVisual({
  type,
}: {
  type: (typeof SLIDES)[number]["visual"];
}) {
  if (type === "budget") {
    return (
      <View style={styles.visualCard}>
        <AppText style={styles.miniLabel}>Budget Planner</AppText>

        <View style={styles.miniBudgetInput}>
          <AppText style={styles.miniSign}>₦</AppText>
          <AppText style={styles.miniValue}>10,000</AppText>
        </View>

        <MiniMeal time="7AM" emoji="🥚" name="Akara & Pap" cost="₦900" />
        <MiniMeal time="1PM" emoji="🍛" name="Jollof Rice" cost="₦3,500" />
        <MiniMeal time="7PM" emoji="🥘" name="Egusi Soup" cost="₦4,800" />
      </View>
    );
  }

  if (type === "recipes") {
    return (
      <View style={styles.visualCard}>
        <AppText style={styles.miniLabel}>450+ Recipes</AppText>

        <View style={styles.miniRecipeGrid}>
          <MiniRecipe emoji="🍛" name="Jollof Rice" cost="₦3,500" />
          <MiniRecipe emoji="🥘" name="Egusi Soup" cost="₦4,800" />
          <MiniRecipe emoji="🫘" name="Beans" cost="₦1,800" />
        </View>
      </View>
    );
  }

  if (type === "units") {
    return (
      <View style={styles.visualCard}>
        <AppText style={styles.miniLabel}>Smart Ingredients</AppText>

        <MiniIngredient emoji="🍚" name="Long Grain Rice" unit="cups" active />
        <MiniIngredient emoji="🍗" name="Chicken Pieces" unit="g" />
        <MiniIngredient emoji="🍅" name="Fresh Tomatoes" unit="oz" />
        <MiniIngredient emoji="🫒" name="Vegetable Oil" unit="tbsp" />

        <View style={styles.unitRow}>
          <View style={styles.unitButton}>
            <AppText style={styles.unitText}>g/mL</AppText>
          </View>
          <View style={[styles.unitButton, styles.unitButtonActive]}>
            <AppText style={styles.unitTextActive}>cups</AppText>
          </View>
          <View style={styles.unitButton}>
            <AppText style={styles.unitText}>oz</AppText>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.visualCard}>
      <AppText style={styles.miniLabel}>Auto Shopping List</AppText>

      <MiniShopItem checked name="Long Grain Rice · 2 cups" />
      <MiniShopItem name="Chicken Pieces · 500g" />
      <MiniShopItem checked name="Fresh Tomatoes · 400g" />
      <MiniShopItem name="Bell Peppers · 200g" />

      <View style={styles.golemonMini}>
        <AppText style={styles.golemonEmoji}>🍋</AppText>
        <AppText style={styles.golemonText}>Checkout with GoLemon →</AppText>
      </View>
    </View>
  );
}

function MiniMeal({
  time,
  emoji,
  name,
  cost,
}: {
  time: string;
  emoji: string;
  name: string;
  cost: string;
}) {
  return (
    <View style={styles.miniMealRow}>
      <AppText style={styles.miniMealTime}>{time}</AppText>
      <AppText style={styles.miniMealEmoji}>{emoji}</AppText>
      <AppText style={styles.miniMealName}>{name}</AppText>
      <AppText style={styles.miniMealCost}>{cost}</AppText>
    </View>
  );
}

function MiniRecipe({
  emoji,
  name,
  cost,
}: {
  emoji: string;
  name: string;
  cost: string;
}) {
  return (
    <View style={styles.miniRecipe}>
      <View style={styles.miniRecipeImage}>
        <AppText style={styles.miniRecipeEmoji}>{emoji}</AppText>
      </View>
      <View style={styles.miniRecipeBody}>
        <AppText style={styles.miniRecipeName}>{name}</AppText>
        <AppText style={styles.miniRecipeCost}>{cost}</AppText>
      </View>
    </View>
  );
}

function MiniIngredient({
  emoji,
  name,
  unit,
  active,
}: {
  emoji: string;
  name: string;
  unit: string;
  active?: boolean;
}) {
  return (
    <View style={styles.miniIngredientRow}>
      <AppText style={styles.miniIngredientEmoji}>{emoji}</AppText>
      <AppText style={styles.miniIngredientName}>{name}</AppText>
      <View
        style={[
          styles.miniIngredientUnit,
          active && styles.miniIngredientUnitActive,
        ]}
      >
        <AppText style={styles.miniIngredientUnitText}>{unit}</AppText>
      </View>
    </View>
  );
}

function MiniShopItem({ checked, name }: { checked?: boolean; name: string }) {
  return (
    <View style={styles.miniShopItem}>
      <View style={[styles.miniCheck, checked && styles.miniCheckDone]}>
        {checked ? <AppText style={styles.miniCheckText}>✓</AppText> : null}
      </View>
      <AppText style={styles.miniShopName}>{name}</AppText>
    </View>
  );
}

function Decorations() {
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <AppText style={[styles.deco, styles.decoLeaf]}>🍃</AppText>
      <AppText style={[styles.deco, styles.decoPepper]}>🌶️</AppText>
      <AppText style={[styles.deco, styles.decoBeans]}>🫘</AppText>
      <AppText style={[styles.deco, styles.decoHerb]}>🌿</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: theme.colors.navy,
  },
  header: {
    paddingHorizontal: theme.spacing["2xl"],
    paddingTop: 56,
    paddingBottom: theme.spacing.xl,
    alignItems: "flex-end",
  },
  skip: {
    fontFamily: theme.fontFamily.bodySemiBold,
    fontSize: 13,
    color: theme.colors.onDark2,
  },
  slide: {
    flex: 1,
    alignItems: "center",
    paddingHorizontal: 32,
  },
  visualWrap: {
    width: "100%",
    height: 260,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 32,
  },
  visualCard: {
    width: 280,
    backgroundColor: theme.colors.cream,
    borderRadius: 20,
    padding: 18,
    overflow: "hidden",
  },
  miniLabel: {
    fontFamily: theme.fontFamily.bodyBold,
    fontSize: 9,
    color: theme.colors.textMuted,
    letterSpacing: 1.5,
    textTransform: "uppercase",
    marginBottom: 6,
  },
  miniBudgetInput: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: theme.colors.cream2,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 10,
  },
  miniSign: {
    fontFamily: theme.fontFamily.display,
    fontSize: 20,
    color: theme.colors.orange,
  },
  miniValue: {
    fontFamily: theme.fontFamily.display,
    fontSize: 20,
    color: theme.colors.navy,
  },
  miniMealRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 7,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  miniMealTime: {
    fontFamily: theme.fontFamily.bodyBold,
    fontSize: 8,
    color: theme.colors.textMuted,
    width: 24,
  },
  miniMealEmoji: {
    fontSize: 18,
  },
  miniMealName: {
    flex: 1,
    fontFamily: theme.fontFamily.bodySemiBold,
    fontSize: 11,
    color: theme.colors.text,
  },
  miniMealCost: {
    fontFamily: theme.fontFamily.bodyBold,
    fontSize: 10,
    color: theme.colors.green,
  },
  miniRecipeGrid: {
    flexDirection: "row",
    gap: 8,
  },
  miniRecipe: {
    flex: 1,
    borderRadius: 10,
    overflow: "hidden",
    backgroundColor: theme.colors.cream2,
  },
  miniRecipeImage: {
    height: 55,
    alignItems: "center",
    justifyContent: "center",
  },
  miniRecipeEmoji: {
    fontSize: 28,
  },
  miniRecipeBody: {
    paddingHorizontal: 6,
    paddingVertical: 5,
  },
  miniRecipeName: {
    fontFamily: theme.fontFamily.bodyBold,
    fontSize: 9,
    color: theme.colors.navy,
  },
  miniRecipeCost: {
    fontFamily: theme.fontFamily.body,
    fontSize: 8,
    color: theme.colors.textMuted,
    marginTop: 2,
  },
  miniIngredientRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 5,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  miniIngredientEmoji: {
    fontSize: 14,
  },
  miniIngredientName: {
    flex: 1,
    fontFamily: theme.fontFamily.body,
    fontSize: 9,
    color: theme.colors.text,
  },
  miniIngredientUnit: {
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: theme.colors.borderOrange,
    borderRadius: 4,
  },
  miniIngredientUnitActive: {
    backgroundColor: theme.colors.orangeDim,
  },
  miniIngredientUnitText: {
    fontFamily: theme.fontFamily.bodyBold,
    fontSize: 8,
    color: theme.colors.orange,
  },
  unitRow: {
    flexDirection: "row",
    gap: 5,
    marginTop: 8,
  },
  unitButton: {
    flex: 1,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    alignItems: "center",
  },
  unitButtonActive: {
    borderColor: theme.colors.orange,
    backgroundColor: theme.colors.orangeDim,
  },
  unitText: {
    fontFamily: theme.fontFamily.bodyBold,
    fontSize: 9,
    color: theme.colors.textMuted,
  },
  unitTextActive: {
    fontFamily: theme.fontFamily.bodyBold,
    fontSize: 9,
    color: theme.colors.orange,
  },
  miniShopItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  miniCheck: {
    width: 16,
    height: 16,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: theme.colors.border2,
    alignItems: "center",
    justifyContent: "center",
  },
  miniCheckDone: {
    backgroundColor: theme.colors.green,
    borderColor: theme.colors.green,
  },
  miniCheckText: {
    fontFamily: theme.fontFamily.bodyBold,
    fontSize: 9,
    color: theme.colors.white,
  },
  miniShopName: {
    flex: 1,
    fontFamily: theme.fontFamily.bodyMedium,
    fontSize: 10,
    color: theme.colors.text,
  },
  golemonMini: {
    marginTop: 10,
    padding: 9,
    backgroundColor: theme.colors.navy,
    borderRadius: 9,
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },
  golemonEmoji: {
    fontSize: 14,
  },
  golemonText: {
    fontFamily: theme.fontFamily.bodyBold,
    fontSize: 10,
    color: theme.colors.white,
  },
  title: {
    fontFamily: theme.fontFamily.display,
    fontSize: 30,
    lineHeight: 36,
    color: theme.colors.onDark,
    textAlign: "center",
    marginBottom: theme.spacing.md,
  },
  description: {
    fontFamily: theme.fontFamily.body,
    fontSize: 14,
    lineHeight: 23,
    color: theme.colors.onDark2,
    textAlign: "center",
  },
  footer: {
    paddingHorizontal: 32,
    paddingBottom: 40,
    gap: theme.spacing.lg,
  },
  dots: {
    flexDirection: "row",
    gap: 7,
    justifyContent: "center",
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: theme.colors.onDark3,
  },
  activeDot: {
    width: 24,
    backgroundColor: theme.colors.orange,
  },
  actions: {
    flexDirection: "row",
    gap: theme.spacing.md,
  },
  nextButton: {
    flex: 1,
  },
  deco: {
    position: "absolute",
  },
  decoLeaf: {
    top: "14%",
    left: "2%",
    fontSize: 38,
    opacity: 0.12,
    transform: [{ rotate: "-20deg" }],
  },
  decoPepper: {
    top: "20%",
    right: "3%",
    fontSize: 44,
    opacity: 0.1,
    transform: [{ rotate: "25deg" }],
  },
  decoBeans: {
    bottom: "22%",
    left: "3%",
    fontSize: 36,
    opacity: 0.12,
    transform: [{ rotate: "15deg" }],
  },
  decoHerb: {
    bottom: "18%",
    right: "2%",
    fontSize: 40,
    opacity: 0.1,
    transform: [{ rotate: "-15deg" }],
  },
});
