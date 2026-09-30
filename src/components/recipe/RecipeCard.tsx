
import { Pressable, StyleSheet, View } from "react-native";
import { Recipe } from "../../data/recipes";
import { theme } from "../../theme/theme";
import { AppText } from "../ui/AppText";
import { PhotoChip, RecipePhoto } from "./RecipePhoto";

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
      accessibilityRole="button"
      accessibilityLabel={`Open ${recipe.name}`}
    >
      <RecipePhoto imageUrl={recipe.imageUrl} scrim="compact" style={styles.photo}>
        {firstTag ? (
          <View style={styles.tagWrap}>
            <PhotoChip label={firstTag} background="rgba(251,251,247,0.85)" />
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
