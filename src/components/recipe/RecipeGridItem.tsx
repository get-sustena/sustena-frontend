import { router } from "expo-router";
import { StyleSheet, View } from "react-native";
import type { Recipe } from "../../data/recipes";
import { RecipeTile } from "./RecipeTile";

type Props = {
  recipe: Recipe;
  index: number;
};

// One cell of a two-column FlashList grid. FlashList has no
// columnWrapperStyle, so the cell carries the 20px page gutter on its outer
// side and half of the 12px column gap on its inner side.
export function RecipeGridItem({ recipe, index }: Props) {
  return (
    <View style={[styles.cell, index % 2 === 0 ? styles.startCell : styles.endCell]}>
      <RecipeTile
        recipe={recipe}
        onPress={() =>
          router.push({
            pathname: "/recipes/[id]",
            params: { id: recipe.id },
          })
        }
      />
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
