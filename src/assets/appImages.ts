// WebP at 3x the size each picture is drawn at: the kitchen-card pepper at
// 118 points wide, the empty-state pictures at up to 288.
export const appImages = {
  emptyStates: {
    pantry: require("../../assets/images/empty-states/pantry-empty-state.webp"),
    publishedRecipe: require("../../assets/images/empty-states/published-recipe-empty-state.webp"),
    recipeDrafts: require("../../assets/images/empty-states/recipe-drafts-empty-state.webp"),
    savedRecipe: require("../../assets/images/empty-states/saved-recipe-empty-state.webp"),
    shoppingList: require("../../assets/images/empty-states/shopping-list-empty-state.webp"),
  },
  home: {
    kitchenPepper: require("../../assets/images/empty-states/pepper-cutout-whats-in-my-kitchen-card.webp"),
  },
} as const;
