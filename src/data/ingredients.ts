// src/data/ingredients.ts

export type IngredientCategory =
  | "Proteins"
  | "Grains"
  | "Produce"
  | "Spices"
  | "Dairy";

export type Ingredient = {
  id: string;
  name: string;
  category: IngredientCategory;
};

export const INGREDIENTS: Ingredient[] = [
  // Proteins
  { id: "chicken", name: "Chicken", category: "Proteins" },
  { id: "beef", name: "Beef", category: "Proteins" },
  { id: "goat-meat", name: "Goat Meat", category: "Proteins" },
  { id: "fish", name: "Fish", category: "Proteins" },
  { id: "eggs", name: "Eggs", category: "Proteins" },
  { id: "beans", name: "Beans", category: "Proteins" },
  { id: "shrimp", name: "Shrimp", category: "Proteins" },
  { id: "gizzard", name: "Gizzard", category: "Proteins" },

  // Grains
  { id: "rice", name: "Rice", category: "Grains" },
  { id: "yam", name: "Yam", category: "Grains" },
  { id: "plantain", name: "Plantain", category: "Grains" },
  { id: "spaghetti", name: "Spaghetti", category: "Grains" },
  { id: "oats", name: "Oats", category: "Grains" },
  { id: "bread", name: "Bread", category: "Grains" },

  // Produce
  { id: "tomatoes", name: "Tomatoes", category: "Produce" },
  { id: "onions", name: "Onions", category: "Produce" },
  { id: "bell-peppers", name: "Bell Peppers", category: "Produce" },
  { id: "scotch-bonnet", name: "Scotch Bonnet", category: "Produce" },
  { id: "spinach", name: "Spinach", category: "Produce" },
  { id: "ugwu", name: "Ugwu", category: "Produce" },
  { id: "garlic", name: "Garlic", category: "Produce" },
  { id: "ginger", name: "Ginger", category: "Produce" },
  { id: "carrots", name: "Carrots", category: "Produce" },

  // Spices
  { id: "curry", name: "Curry", category: "Spices" },
  { id: "thyme", name: "Thyme", category: "Spices" },
  { id: "maggi", name: "Maggi", category: "Spices" },
  { id: "knorr", name: "Knorr", category: "Spices" },
  { id: "suya-spice", name: "Suya Spice", category: "Spices" },
  { id: "crayfish", name: "Crayfish", category: "Spices" },

  // Dairy
  { id: "milk", name: "Milk", category: "Dairy" },
  { id: "butter", name: "Butter", category: "Dairy" },
  { id: "yogurt", name: "Yogurt", category: "Dairy" },
  { id: "cheese", name: "Cheese", category: "Dairy" },
];

export const INGREDIENT_CATEGORIES: ("All" | IngredientCategory)[] = [
  "All",
  "Proteins",
  "Grains",
  "Produce",
  "Spices",
  "Dairy",
];
