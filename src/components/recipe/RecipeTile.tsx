import { Pressable, StyleSheet, View } from "react-native";
import { Recipe } from "../../data/recipes";
import { formatNaira } from "../../lib/formatters";
import { theme } from "../../theme/theme";
import { AppText } from "../ui/AppText";

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
      <View style={styles.imagePlaceholder}>
        <AppText style={styles.emoji}>{recipe.emoji}</AppText>
      </View>

      <View style={styles.body}>
        <AppText style={styles.name} numberOfLines={2}>
          {recipe.name}
        </AppText>

        <View style={styles.metaRow}>
          <AppText style={styles.meta}>⏱ {recipe.time}</AppText>
          <AppText style={styles.meta}>{formatNaira(recipe.cost)}</AppText>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  tile: {
    flex: 1,
    minWidth: 0,
    borderRadius: theme.radius.lg,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    overflow: "hidden",
  },
  pressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
  imagePlaceholder: {
    height: 118,
    backgroundColor: theme.colors.cream2,
    alignItems: "center",
    justifyContent: "center",
  },
  emoji: {
    fontSize: 54,
  },
  body: {
    paddingHorizontal: 11,
    paddingVertical: 10,
  },
  name: {
    fontFamily: theme.fontFamily.bodyBold,
    fontSize: 13,
    lineHeight: 17,
    color: theme.colors.navy,
    marginBottom: 5,
  },
  metaRow: {
    gap: 2,
  },
  meta: {
    fontFamily: theme.fontFamily.body,
    fontSize: 10,
    color: theme.colors.textMuted,
  },
});
