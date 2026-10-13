
import { Pressable, StyleSheet, View } from "react-native";
import { Recipe } from "../../data/recipes";
import { theme } from "../../theme/theme";
import { AppText } from "../ui/AppText";
import { Icon } from "../ui/Icon";
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

        {recipe.ratingCount ? (
          <View style={styles.communityRow}>
            <View style={styles.communitySpacer} />
            <View style={styles.rating}>
              <Icon name="star" size={11} color={theme.colors.orange} />
              <AppText style={styles.ratingText}>
                {recipe.averageRating?.toFixed(1)}
              </AppText>
            </View>
          </View>
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  tile: {
    flex: 1,
    minWidth: 0,
    backgroundColor: theme.colors.page,
    borderWidth: 0.5,
    borderColor: theme.colors.border,
    borderRadius: 16,
    overflow: "hidden",
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
    fontFamily: theme.fontFamily.body,
    fontSize: 13,
    letterSpacing: 0.39,
    color: theme.colors.textMedium,
  },
  communityRow: {
    marginTop: 7,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  communitySpacer: { flex: 1 },
  rating: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  // v6.8's rating style (the public profile's rating chip renders Inter Regular).
  ratingText: {
    fontFamily: theme.fontFamily.body,
    fontSize: 12,
    color: theme.colors.text,
  },
});
