
import { Pressable, StyleSheet, View } from "react-native";
import { Recipe } from "../../data/recipes";
import { theme } from "../../theme/theme";
import { AppText } from "../ui/AppText";
import { Icon } from "../ui/Icon";
import { PhotoChip, RecipePhoto } from "./RecipePhoto";

type Props = {
  recipe: Recipe;
  onPress?: () => void;
};

export function FeaturedRecipeCard({ recipe, onPress }: Props) {
  const firstTag = recipe.tags[0];

  return (
    <View style={styles.card}>
      <RecipePhoto imageUrl={recipe.imageUrl} scrim="full" style={styles.photo}>
        {firstTag ? (
          <View style={styles.tagWrap}>
            <PhotoChip label={firstTag} />
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
              accessibilityLabel={`Cook ${recipe.name} tonight`}
            >
              <AppText style={styles.ctaText}>Cook This Tonight</AppText>
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
