
export type RecipeTag =
  | "Nigerian"
  | "Budget"
  | "Vegan"
  | "High Protein"
  | "Quick"
  | "Traditional"
  | "Pescetarian"
  | "Healthy"
  | "Breakfast"
  | string;

export type UnitMode = "metric" | "cups" | "imperial";

export type RecipeIngredientAmount = Record<UnitMode, string>;

export type RecipeIngredientAvailableUnit = {
  quantity: string | number | null;
  unit: string | null;
  label: string;
  source?: string;
  confidence?: string | number;
};

export type RecipeIngredient = {
  id: string;
  emoji: string;
  name: string;
  canonicalIngredientName?: string | null;
  rawText?: string | null;
  category: string;
  amount: RecipeIngredientAmount;
  availableUnits?: RecipeIngredientAvailableUnit[];
  displayText?: string | null;
  quantity?: string | number | null;
  unit?: string | null;
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
  imageUrl?: string | null;
  time: string;
  calories: number | null;
  cost: number | null;
  prepTimeMinutes?: number | null;
  cookTimeMinutes?: number | null;
  totalTimeMinutes?: number | null;
  activePrepTimeMinutes?: number | null;
  passiveTimeMinutes?: number | null;
  difficulty: "Easy" | "Medium" | "Hard";
  tags: RecipeTag[];
  filters: string[];
  ingredients: RecipeIngredient[];
  steps: string[];
  notes?: string[];
  tools: RecipeTool[];
  baseServings: number;
  creator?: {
    id: string;
    displayName: string;
    handle: string;
    avatarUrl: string | null;
  } | null;
  averageRating?: number | null;
  ratingCount?: number;
};
