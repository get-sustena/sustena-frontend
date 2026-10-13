
import { Pressable, StyleSheet, View } from "react-native";
import { Recipe } from "../../data/recipes";
import { getCardChipLabel, type MealTime } from "../../lib/mealTime";
import { theme } from "../../theme/theme";
import { AppText } from "../ui/AppText";
import { Icon } from "../ui/Icon";
import { PhotoChip, RecipePhoto } from "./RecipePhoto";

type Props = {
  recipe: Recipe;
  mealTime: MealTime;
  onPress?: () => void;
};

// Wording approved by the founder on 13 October 2026.
const COOK_LABELS: Record<MealTime, string> = {
  breakfast: "Cook This Morning",
  lunch: "Cook This for Lunch",
  dinner: "Cook This Tonight",
};

export function FeaturedRecipeCard({ recipe, mealTime, onPress }: Props) {
  const chipLabel = getCardChipLabel(recipe.tags, mealTime);
  const cookLabel = COOK_LABELS[mealTime];

  return (
    <View style={styles.card}>
      <RecipePhoto imageUrl={recipe.imageUrl} scrim="full" style={styles.photo}>
        {chipLabel ? (
          <View style={styles.tagWrap}>
            <PhotoChip label={chipLabel} />
          </View>
        ) : null}

        <View style={styles.content}>
          <AppText style={styles.title}>{recipe.name}</AppText>

          <View style={styles.chipRow}>
            <PhotoChip
              label={recipe.time}
              color={theme.colors.onDark}
              background="rgba(255,255,255,0.16)"
            />
            {recipe.cost !== null ? (
              <PhotoChip
                label={`₦${recipe.cost.toLocaleString("en-NG")}`}
                color={theme.colors.onDark}
                background="rgba(255,255,255,0.16)"
              />
            ) : null}
            <PhotoChip
              label={recipe.difficulty}
              color={theme.colors.onDark}
              background="rgba(255,255,255,0.16)"
            />
          </View>

          <View style={styles.ctaWrap}>
            <Pressable
              onPress={onPress}
              style={({ pressed }) => [styles.cta, pressed && styles.pressed]}
              accessibilityRole="button"
              accessibilityLabel={`${cookLabel}: ${recipe.name}`}
            >
              <AppText style={styles.ctaText}>{cookLabel}</AppText>
              <Icon
                name="chevronRight"
                size={15}
                color={theme.colors.text}
                strokeWidth={2.5}
              />
            </Pressable>
          </View>
        </View>
      </RecipePhoto>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 24,
    overflow: "hidden",
    shadowColor: theme.colors.navy,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.22,
    shadowRadius: 18,
    elevation: 8,
  },
  photo: {
    height: 300,
    justifyContent: "flex-end",
  },
  tagWrap: {
    position: "absolute",
    top: 14,
    left: 14,
  },
  content: {
    paddingHorizontal: 18,
    paddingBottom: 20,
  },
  title: {
    fontFamily: theme.fontFamily.display,
    fontSize: 22,
    lineHeight: 25,
    color: theme.colors.onDark,
    marginBottom: 9,
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 7,
    marginBottom: 20,
  },
  ctaWrap: {
    alignItems: "center",
  },
  cta: {
    backgroundColor: theme.colors.orange,
    borderRadius: 999,
    paddingHorizontal: 22,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  pressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
  ctaText: {
    fontFamily: theme.fontFamily.bodySemiBold,
    fontSize: 14.5,
    color: theme.colors.text,
  },
});
