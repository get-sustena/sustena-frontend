// src/components/recipe/RecipeTile.tsx
// The Recipes tab's 2-column grid tile — ported verbatim from the mockup's
// renderRecGrid() card template.

import { Pressable, StyleSheet, View } from "react-native";
import { Recipe } from "../../data/recipes";
import { theme } from "../../theme/theme";
import { AppText } from "../ui/AppText";
import { RecipePhoto } from "./RecipePhoto";

type Props = {
  recipe: Recipe;
  onPress?: () => void;
};

export function RecipeTile({ recipe, onPress }: Props) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.tile, pressed && styles.pressed]}
    >
      <RecipePhoto
        imageUrl={recipe.imageUrl}
        fallbackLabel="recipe photo"
        fallbackLabelVariant="compact"
        style={styles.photo}
      />

      <View style={styles.body}>
        <AppText style={styles.name} numberOfLines={2}>
          {recipe.name}
        </AppText>

        <View style={styles.metaRow}>
          <AppText style={styles.meta}>{recipe.time}</AppText>
          {recipe.cost !== null ? (
            <AppText style={styles.meta}>
              {" "}
              · ₦{recipe.cost.toLocaleString("en-NG")}
            </AppText>
          ) : null}
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  tile: {
    flex: 1,
    minWidth: 0,
    backgroundColor: theme.colors.card,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: "#1B211C",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.24,
    shadowRadius: 24,
    elevation: 3,
  },
  pressed: {
    opacity: 0.9,
  },
  photo: {
    height: 104,
  },
  body: {
    paddingHorizontal: 13,
    paddingTop: 12,
    paddingBottom: 14,
  },
  name: {
    fontFamily: theme.fontFamily.bodySemiBold,
    fontSize: 15,
    lineHeight: 18,
    color: theme.colors.text,
  },
  metaRow: {
    flexDirection: "row",
    marginTop: 6,
  },
  meta: {
    fontFamily: theme.fontFamily.mono,
    fontSize: 13,
    letterSpacing: 0,
    color: theme.colors.textMedium,
  },
});
