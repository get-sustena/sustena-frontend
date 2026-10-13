
import { Pressable, StyleSheet, View } from "react-native";
import { Recipe } from "../../data/recipes";
import { getCardChipLabel, type MealTime } from "../../lib/mealTime";
import { theme } from "../../theme/theme";
import { AppText } from "../ui/AppText";
import { PhotoChip, RecipePhoto } from "./RecipePhoto";

type Props = {
  recipe: Recipe;
  mealTime: MealTime;
  onPress?: () => void;
};

export function RecipeCard({ recipe, mealTime, onPress }: Props) {
  const chipLabel = getCardChipLabel(recipe.tags, mealTime);

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
      accessibilityRole="button"
      accessibilityLabel={`Open ${recipe.name}`}
    >
      <RecipePhoto imageUrl={recipe.imageUrl} scrim="compact" style={styles.photo}>
        {chipLabel ? (
          <View style={styles.tagWrap}>
            <PhotoChip label={chipLabel} background="rgba(251,251,247,0.85)" />
          </View>
        ) : null}

        <View style={styles.content}>
          <AppText style={styles.name} numberOfLines={2}>
            {recipe.name}
          </AppText>

          <View style={styles.metaRow}>
            <AppText style={styles.meta}>{recipe.time}</AppText>
            {recipe.cost !== null ? (
              <>
                <AppText style={styles.metaDot}>·</AppText>
                <AppText style={styles.meta}>
                  ₦{recipe.cost.toLocaleString("en-NG")}
                </AppText>
              </>
            ) : null}
            <AppText style={styles.metaDot}>·</AppText>
            <AppText style={styles.meta}>{recipe.difficulty}</AppText>
          </View>
        </View>
      </RecipePhoto>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    width: 190,
    height: 236,
    borderRadius: 20,
    overflow: "hidden",
    shadowColor: "#1B211C",
    shadowOffset: { width: 0, height: 7 },
    shadowOpacity: 0.18,
    shadowRadius: 13,
    elevation: 5,
  },
  pressed: {
    opacity: 0.9,
  },
  photo: {
    flex: 1,
    justifyContent: "flex-end",
  },
  tagWrap: {
    position: "absolute",
    top: 10,
    left: 10,
  },
  content: {
    paddingHorizontal: 13,
    paddingBottom: 13,
  },
  name: {
    fontFamily: theme.fontFamily.bodySemiBold,
    fontSize: 15,
    lineHeight: 19,
    color: theme.colors.onDark,
    marginBottom: 7,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  meta: {
    fontFamily: theme.fontFamily.mono,
    fontSize: 12.5,
    color: theme.colors.onDark,
  },
  metaDot: {
    fontFamily: theme.fontFamily.mono,
    fontSize: 12.5,
    color: theme.colors.onDark,
    opacity: 0.6,
  },
});
