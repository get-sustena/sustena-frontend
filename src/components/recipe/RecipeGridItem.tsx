import { StyleSheet, View } from "react-native";
import type { Recipe } from "../../data/recipes";
import { openRecipe } from "../../lib/navigation/openRecipe";
import type { RecipeSource } from "../../lib/recipeSource";
import { RecipeTile } from "./RecipeTile";

type Props = {
  recipe: Recipe;
  index: number;
  source: RecipeSource;
};

// One cell of a two-column FlashList grid. FlashList has no
// columnWrapperStyle, so the cell carries the 20px page gutter on its outer
// side and half of the 12px column gap on its inner side.
export function RecipeGridItem({ recipe, index, source }: Props) {
  return (
    <View style={[styles.cell, index % 2 === 0 ? styles.startCell : styles.endCell]}>
      <RecipeTile recipe={recipe} onPress={() => openRecipe(recipe.id, source)} />
    </View>
  );
}

const styles = StyleSheet.create({
  cell: {
    flexGrow: 1,
    flexDirection: "row",
    paddingBottom: 12,
  },
  startCell: {
    paddingLeft: 20,
    paddingRight: 6,
  },
  endCell: {
    paddingLeft: 6,
    paddingRight: 20,
  },
});
