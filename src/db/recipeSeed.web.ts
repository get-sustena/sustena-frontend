import type { RecipeCatalogue } from "./recipeRows";

// The web loads recipes from the server; it doesn't ship the catalogue.
export const bundledRecipeCatalogue: RecipeCatalogue | null = null;
