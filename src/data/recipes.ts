// src/data/recipes.ts

export type RecipeTag =
  | "Nigerian"
  | "Budget"
  | "Vegan"
  | "High Protein"
  | "Quick"
  | "Traditional"
  | "Pescetarian"
  | "Healthy"
  | "Breakfast";

export type UnitMode = "metric" | "cups" | "imperial";

export type RecipeIngredientAmount = Record<UnitMode, string>;

export type RecipeIngredient = {
  id: string;
  emoji: string;
  name: string;
  category: string;
  amount: RecipeIngredientAmount;
};

export type RecipeTool = {
  id: string;
  emoji: string;
  name: string;
  price: number;
};

export type Recipe = {
  id: string;
  name: string;
  emoji: string;
  time: string;
  calories: number;
  cost: number;
  difficulty: "Easy" | "Medium" | "Hard";
  tags: RecipeTag[];
  filters: string[];
  ingredients: RecipeIngredient[];
  steps: string[];
  tools: RecipeTool[];
  baseServings: number;
};

export const RECIPES: Recipe[] = [
  {
    id: "jollof-rice-and-chicken",
    name: "Jollof Rice & Chicken",
    emoji: "🍛",
    time: "45 mins",
    calories: 380,
    cost: 3500,
    difficulty: "Medium",
    tags: ["Nigerian", "High Protein"],
    filters: ["nigerian", "highprotein"],
    baseServings: 2,
    ingredients: [
      {
        id: "long-grain-rice",
        emoji: "🍚",
        name: "Long Grain Rice",
        category: "Grains",
        amount: {
          metric: "2 cups",
          cups: "2 cups",
          imperial: "12 oz",
        },
      },
      {
        id: "chicken-pieces",
        emoji: "🍗",
        name: "Chicken Pieces",
        category: "Proteins",
        amount: {
          metric: "500g",
          cups: "~2 cups diced",
          imperial: "17 oz",
        },
      },
      {
        id: "fresh-tomatoes",
        emoji: "🍅",
        name: "Fresh Tomatoes",
        category: "Produce",
        amount: {
          metric: "400g",
          cups: "1⅔ cups blended",
          imperial: "14 oz",
        },
      },
    ],
    steps: [
      "Season chicken with curry, thyme, salt and seasoning cubes. Fry or grill until cooked through.",
      "Blend tomatoes, bell peppers, scotch bonnet and onion into a smooth paste.",
      "Heat oil in a pot. Fry the blended tomato mix for 15 minutes.",
      "Add chicken stock and bring to a boil. Add washed rice and stir well.",
      "Reduce heat to low, cover tightly and cook for 25 minutes.",
    ],
    tools: [
      {
        id: "non-stick-pot",
        emoji: "🍳",
        name: "Non-stick Pot",
        price: 4500,
      },
    ],
  },
  {
    id: "beans-and-plantain",
    name: "Beans & Plantain",
    emoji: "🫘",
    time: "40 mins",
    calories: 380,
    cost: 1800,
    difficulty: "Easy",
    tags: ["Nigerian", "Budget", "Vegan"],
    filters: ["nigerian", "budget", "vegan"],
    baseServings: 2,
    ingredients: [
      {
        id: "brown-beans",
        emoji: "🫘",
        name: "Brown Beans",
        category: "Proteins",
        amount: {
          metric: "300g",
          cups: "1½ cups",
          imperial: "10 oz",
        },
      },
      {
        id: "ripe-plantain",
        emoji: "🍌",
        name: "Ripe Plantain",
        category: "Produce",
        amount: {
          metric: "2 medium",
          cups: "2 medium",
          imperial: "2 medium",
        },
      },
    ],
    steps: [
      "Pick and wash beans.",
      "Cook beans with onions until soft.",
      "Fry plantain slices until golden brown.",
      "Add palm oil, pepper, and salt to beans.",
    ],
    tools: [],
  },
  {
    id: "concoction-rice",
    name: "Concoction Rice",
    emoji: "🍚",
    time: "35 mins",
    calories: 400,
    cost: 1500,
    difficulty: "Easy",
    tags: ["Nigerian", "Budget", "Quick"],
    filters: ["nigerian", "budget", "quick"],
    baseServings: 2,
    ingredients: [
      {
        id: "rice",
        emoji: "🍚",
        name: "Rice",
        category: "Grains",
        amount: {
          metric: "2 cups",
          cups: "2 cups",
          imperial: "12 oz",
        },
      },
      {
        id: "palm-oil",
        emoji: "🫒",
        name: "Palm Oil",
        category: "Pantry",
        amount: {
          metric: "3 tbsp",
          cups: "3 tbsp",
          imperial: "3 tbsp",
        },
      },
      {
        id: "tomatoes",
        emoji: "🍅",
        name: "Tomatoes",
        category: "Produce",
        amount: {
          metric: "200g",
          cups: "¾ cup blended",
          imperial: "7 oz",
        },
      },
    ],
    steps: [
      "Wash rice thoroughly and parboil for 10 minutes.",
      "Heat palm oil and fry onions until soft.",
      "Add blended tomatoes and pepper.",
      "Add rice and stir to coat with the sauce.",
      "Add water, seasoning, and cook on low heat until soft.",
    ],
    tools: [],
  },
  {
    id: "fried-rice",
    name: "Fried Rice",
    emoji: "🍳",
    time: "50 mins",
    calories: 380,
    cost: 3000,
    difficulty: "Medium",
    tags: ["Nigerian"],
    filters: ["nigerian"],
    baseServings: 2,
    ingredients: [
      {
        id: "long-grain-rice",
        emoji: "🍚",
        name: "Long Grain Rice",
        category: "Grains",
        amount: {
          metric: "3 cups",
          cups: "3 cups",
          imperial: "18 oz",
        },
      },
      {
        id: "carrots",
        emoji: "🥕",
        name: "Carrots",
        category: "Produce",
        amount: {
          metric: "150g",
          cups: "1 cup diced",
          imperial: "5 oz",
        },
      },
      {
        id: "green-peas",
        emoji: "🫛",
        name: "Green Peas",
        category: "Produce",
        amount: {
          metric: "100g",
          cups: "¾ cup",
          imperial: "3.5 oz",
        },
      },
    ],
    steps: [
      "Parboil rice until about 70% done.",
      "Boil diced vegetables briefly and drain.",
      "Heat oil and sauté onions.",
      "Add curry and vegetables.",
      "Mix in rice and stir-fry until cooked.",
    ],
    tools: [
      {
        id: "large-pan",
        emoji: "🥘",
        name: "Wok / Large Pan",
        price: 5500,
      },
    ],
  },
  {
    id: "oats-porridge",
    name: "Oats Porridge",
    emoji: "🌿",
    time: "15 mins",
    calories: 280,
    cost: 800,
    difficulty: "Easy",
    tags: ["Vegan", "Healthy", "Quick", "Breakfast"],
    filters: ["vegan", "quick", "budget"],
    baseServings: 2,
    ingredients: [
      {
        id: "rolled-oats",
        emoji: "🌾",
        name: "Rolled Oats",
        category: "Grains",
        amount: {
          metric: "80g",
          cups: "1 cup",
          imperial: "2.8 oz",
        },
      },
      {
        id: "banana",
        emoji: "🍌",
        name: "Banana",
        category: "Produce",
        amount: {
          metric: "1 large",
          cups: "1 large",
          imperial: "1 large",
        },
      },
    ],
    steps: [
      "Heat milk in a small pot.",
      "Add oats and stir frequently.",
      "Add banana and mash lightly.",
      "Serve with fruit or nuts.",
    ],
    tools: [],
  },
];
