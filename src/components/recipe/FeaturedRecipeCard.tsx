import { Image } from "expo-image";
import { Pressable, StyleSheet, View } from "react-native";
import { Recipe } from "../../data/recipes";
import { theme } from "../../theme/theme";
import { AppText } from "../ui/AppText";

type Props = {
  recipe: Recipe;
  onPress?: () => void;
};

export function FeaturedRecipeCard({ recipe, onPress }: Props) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      {recipe.imageUrl ? (
        <Image
          source={{ uri: recipe.imageUrl }}
          style={styles.image}
          contentFit="cover"
          transition={150}
        />
      ) : null}
      <View style={styles.decorLayer} />
      {!recipe.imageUrl ? <AppText style={styles.emoji}>{recipe.emoji}</AppText> : null}

      <View style={styles.content}>
        <AppText style={styles.label}>⭐ Chef&apos;s Pick</AppText>

        <AppText style={styles.title}>{recipe.name}</AppText>

        <View style={styles.metaRow}>
          <AppText style={styles.meta}>⏱ {recipe.time}</AppText>
          {recipe.calories !== null ? (
            <AppText style={styles.meta}>🔥 {recipe.calories} kcal</AppText>
          ) : null}
          {recipe.cost !== null ? (
            <AppText style={styles.meta}>
              ₦{recipe.cost.toLocaleString("en-NG")}
            </AppText>
          ) : null}
        </View>

        <AppText style={styles.cta}>View Recipe →</AppText>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    height: 192,
    marginHorizontal: 20,
    marginBottom: 24,
    borderRadius: theme.radius.lg,
    backgroundColor: theme.colors.navy,
    overflow: "hidden",
    justifyContent: "flex-end",
  },
  decorLayer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: theme.colors.navy2,
    opacity: 0.58,
  },
  image: {
    ...StyleSheet.absoluteFillObject,
  },
  pressed: {
    opacity: 0.9,
    transform: [{ scale: 0.99 }],
  },
  emoji: {
    position: "absolute",
    right: 16,
    top: 48,
    fontSize: 96,
  },
  content: {
    paddingHorizontal: 20,
    paddingVertical: 18,
    maxWidth: "74%",
  },
  label: {
    fontFamily: theme.fontFamily.bodyBold,
    fontSize: 9,
    color: theme.colors.orange2,
    letterSpacing: 2.5,
    textTransform: "uppercase",
    marginBottom: 6,
  },
  title: {
    fontFamily: theme.fontFamily.display,
    fontSize: 23,
    lineHeight: 26,
    color: theme.colors.onDark,
    marginBottom: theme.spacing.sm,
  },
  metaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.spacing.md,
  },
  meta: {
    fontFamily: theme.fontFamily.body,
    fontSize: 11,
    color: theme.colors.onDark2,
  },
  cta: {
    marginTop: 10,
    fontFamily: theme.fontFamily.bodyBold,
    fontSize: 11,
    color: theme.colors.orange2,
  },
});
