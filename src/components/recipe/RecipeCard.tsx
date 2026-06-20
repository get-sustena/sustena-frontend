import { Image } from "expo-image";
import { Pressable, StyleSheet, View } from "react-native";
import { Recipe } from "../../data/recipes";
import { theme } from "../../theme/theme";
import { AppText } from "../ui/AppText";

type Props = {
  recipe: Recipe;
  onPress?: () => void;
};

export function RecipeCard({ recipe, onPress }: Props) {
  const firstTag = recipe.tags[0];

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      <View style={styles.imagePlaceholder}>
        {recipe.imageUrl ? (
          <Image
            source={{ uri: recipe.imageUrl }}
            style={styles.image}
            contentFit="cover"
            transition={150}
          />
        ) : (
          <AppText style={styles.emoji}>{recipe.emoji}</AppText>
        )}
      </View>

      <View style={styles.body}>
        {firstTag ? (
          <View style={styles.tag}>
            <AppText style={styles.tagText}>{firstTag}</AppText>
          </View>
        ) : null}

        <AppText style={styles.name} numberOfLines={2}>
          {recipe.name}
        </AppText>

        <View style={styles.metaRow}>
          <AppText style={styles.meta}>⏱ {recipe.time}</AppText>
          {recipe.cost !== null ? (
            <AppText style={styles.meta}>
              ₦{recipe.cost.toLocaleString("en-NG")}
            </AppText>
          ) : null}
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    width: 158,
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
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.cream2,
  },
  image: {
    width: "100%",
    height: "100%",
  },
  emoji: {
    fontSize: 56,
  },
  body: {
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  tag: {
    alignSelf: "flex-start",
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: theme.radius.full,
    backgroundColor: theme.colors.navyDim,
    marginBottom: 5,
  },
  tagText: {
    fontFamily: theme.fontFamily.bodyBold,
    fontSize: 9,
    color: theme.colors.navy2,
    letterSpacing: 0.5,
  },
  name: {
    fontFamily: theme.fontFamily.bodyBold,
    fontSize: 13,
    lineHeight: 16,
    color: theme.colors.navy,
    marginBottom: 4,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.sm,
  },
  meta: {
    fontFamily: theme.fontFamily.body,
    fontSize: 10,
    color: theme.colors.textMuted,
  },
});
