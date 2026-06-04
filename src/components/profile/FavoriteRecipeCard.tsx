// src/components/profile/FavoriteRecipeCard.tsx

import { router } from "expo-router";
import { Pressable, StyleSheet, View } from "react-native";
import { Recipe } from "../../data/recipes";
import { formatNaira } from "../../lib/formatters";
import { theme } from "../../theme/theme";
import { AppText } from "../ui/AppText";

type Props = {
  recipe: Recipe;
  onRemove: (recipeId: string) => void;
};

export function FavoriteRecipeCard({ recipe, onRemove }: Props) {
  return (
    <Pressable
      onPress={() =>
        router.push({
          pathname: "/recipes/[id]",
          params: { id: recipe.id },
        })
      }
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      <View style={styles.emojiBox}>
        <AppText style={styles.emoji}>{recipe.emoji}</AppText>
      </View>

      <View style={styles.info}>
        <AppText style={styles.name} numberOfLines={1}>
          {recipe.name}
        </AppText>

        <AppText style={styles.meta}>
          ⏱ {recipe.time} · {formatNaira(recipe.cost)}
        </AppText>
      </View>

      <Pressable
        onPress={(event) => {
          event.stopPropagation();
          onRemove(recipe.id);
        }}
        style={styles.removeButton}
      >
        <AppText style={styles.removeText}>♥</AppText>
      </Pressable>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.md,
    paddingVertical: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  pressed: {
    opacity: 0.8,
  },
  emojiBox: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: theme.colors.cream2,
    alignItems: "center",
    justifyContent: "center",
  },
  emoji: {
    fontSize: 24,
  },
  info: {
    flex: 1,
  },
  name: {
    fontFamily: theme.fontFamily.bodyBold,
    fontSize: 14,
    color: theme.colors.navy,
  },
  meta: {
    fontFamily: theme.fontFamily.body,
    fontSize: 11,
    color: theme.colors.textMuted,
    marginTop: 2,
  },
  removeButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: theme.colors.orangeDim,
    alignItems: "center",
    justifyContent: "center",
  },
  removeText: {
    fontSize: 17,
    color: theme.colors.orange,
  },
});
