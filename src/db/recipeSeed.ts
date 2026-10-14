import catalogueJson from "../data/recipe_catalogue_seed.json";
import type { RecipeCatalogue } from "./recipeRows";

// Every public recipe as live had it when this build was made (Backend's
// export of GET /recipes/catalogue), so a first start with no connection
// still has them all under their live ids.
export const bundledRecipeCatalogue = catalogueJson as unknown as RecipeCatalogue;
