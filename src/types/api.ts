export type ISODateTimeString = string;
export type ISODateString = string;
export type UUIDString = string;
export type DecimalString = string;

export type ReviewStatus = "published" | "needs_review" | "hidden";
export type Difficulty = "easy" | "medium" | "hard";
export type DefaultUnitMode = "metric" | "cups" | "imperial";
export type DietaryPreference =
  | "no_restrictions"
  | "vegan"
  | "vegetarian"
  | "pescetarian"
  | "halal"
  | "keto"
  | "high_protein";
export type MealSlot = "breakfast" | "lunch" | "dinner" | "snack";
export type UnitOptionSource =
  | "explicit"
  | "converted"
  | "estimated"
  | "raw_only";
export type MetadataSource =
  | "explicit"
  | "estimated"
  | "defaulted"
  | "imported"
  | "unknown";
export type CostSource =
  | "ingredient_price_table"
  | "estimated"
  | "imported"
  | "unknown";
export type CaloriesSource =
  | "nutrition_table"
  | "estimated"
  | "imported"
  | "unknown";

export interface ApiError {
  detail: string;
  code?: string;
}

export interface ValidationErrorItem {
  type: string;
  loc: (string | number)[];
  msg: string;
  input?: unknown;
  ctx?: Record<string, unknown>;
}

export interface ApiValidationError {
  detail: ValidationErrorItem[];
}

export interface PaginatedResponse<T> {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
}

export interface User {
  id: UUIDString;
  email: string;
  firstName: string;
  lastName: string;
  fullName: string;
  isActive: boolean;
  createdAt: ISODateTimeString;
  updatedAt: ISODateTimeString;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  tokenType: "bearer";
  user: User;
}

export interface RefreshTokenRequest {
  refreshToken: string;
}

export interface RefreshTokenResponse {
  accessToken: string;
  refreshToken: string;
  tokenType: "bearer";
}

export interface LogoutRequest {
  refreshToken: string;
}

export interface LogoutResponse {
  success: boolean;
}

export interface LogoutAllResponse {
  success: boolean;
  revoked: number;
}

export interface SuccessResponse {
  success: boolean;
}

export interface FavoriteMutationResponse {
  success: boolean;
  recipeId: string;
}

export interface ClearCheckedShoppingItemsResponse {
  deleted: number;
}

export interface UserPreferences {
  id: UUIDString;
  userId: UUIDString;
  healthConditions: string[];
  dietaryPreference: DietaryPreference;
  defaultUnitMode: DefaultUnitMode;
  defaultServingSize: number;
  createdAt: ISODateTimeString;
  updatedAt: ISODateTimeString;
}

export interface RecipeListItem {
  id: string;
  name: string;
  slug: string;
  imageUrl: string | null;
  cuisine: string | null;
  tags: string[];
  dietaryTags: string[];
  estimatedCost: number | null;
  caloriesPerServing: number | null;
  totalTimeMinutes: number | null;
  difficulty: Difficulty | null;
  reviewStatus: ReviewStatus;
  isFavorited: boolean;
}

export interface IngredientAvailableUnit {
  quantity: DecimalString | number | null;
  unit: string | null;
  label: string;
  source: UnitOptionSource;
  confidence: DecimalString | number;
}

export interface RecipeIngredient {
  id: UUIDString;
  position: number;
  rawText: string;
  ingredientName: string | null;
  canonicalIngredientName: string | null;
  quantity: DecimalString | number | null;
  unit: string | null;
  quantityText: string | null;
  displayText: string | null;
  alternateQuantity: DecimalString | number | null;
  alternateUnit: string | null;
  availableUnits: IngredientAvailableUnit[];
  preparationNote: string | null;
  category: string | null;
  isCoreIngredient: boolean;
  isOptional: boolean;
  parseConfidence: DecimalString | number | null;
  parseWarnings: string[];
}

export interface RecipeInstruction {
  id: UUIDString;
  stepNumber: number;
  text: string;
  type: string;
}

export interface RecipeNote {
  id: UUIDString;
  text: string;
  type: string | null;
}

export interface RecipeDetail extends RecipeListItem {
  description: string | null;
  baseServings: number | null;
  baseServingsSource: MetadataSource | null;
  prepTimeMinutes: number | null;
  cookTimeMinutes: number | null;
  timeSource: MetadataSource | null;
  difficultySource: MetadataSource | null;
  estimatedCostSource: CostSource | null;
  caloriesSource: CaloriesSource | null;
  sourceUrl: string | null;
  sourceName: string | null;
  sourceSite: string | null;
  qualityScore: number;
  qualityWarnings: string[];
  ingredients: RecipeIngredient[];
  instructions: RecipeInstruction[];
  notes: RecipeNote[];
  allergens: string[];
  createdAt: ISODateTimeString;
  updatedAt: ISODateTimeString;
}

export interface FavoriteRecipe {
  id: UUIDString;
  recipeId: string;
  createdAt: ISODateTimeString;
  updatedAt: ISODateTimeString;
  recipe: RecipeListItem | null;
}

export interface ShoppingListItem {
  id: UUIDString;
  shoppingListId: UUIDString;
  recipeId: string | null;
  name: string;
  canonicalIngredientName: string | null;
  emoji: string | null;
  quantity: string | null;
  unit: string | null;
  category: string | null;
  estimatedPrice: number | null;
  checked: boolean;
  createdAt: ISODateTimeString;
  updatedAt: ISODateTimeString;
  deletedAt: ISODateTimeString | null;
}

export interface ShoppingList {
  id: UUIDString;
  userId: UUIDString;
  name: string;
  isActive: boolean;
  createdAt: ISODateTimeString;
  updatedAt: ISODateTimeString;
  items: ShoppingListItem[];
}

export interface PlannerMeal {
  day: number;
  plannedDate: ISODateString | null;
  mealSlot: MealSlot;
  servings?: number;
  recipe: RecipeListItem;
  estimatedCost: number | null;
}

export interface KitchenPlannerMatch {
  recipe: RecipeListItem;
  score: number;
  matchedIngredients: string[];
  missingIngredients: string[];
}

export interface BudgetPlannerResponse {
  meals: PlannerMeal[];
  matches: [];
  totalEstimatedCost: number;
}

export interface KitchenPlannerResponse {
  meals: [];
  matches: KitchenPlannerMatch[];
  totalEstimatedCost: number;
}

export interface MealPlanResponse {
  meals: PlannerMeal[];
  matches: [];
  totalEstimatedCost: number;
}

export type TimetablePlannerResponse = MealPlanResponse;

export type PlannerResponse =
  | BudgetPlannerResponse
  | KitchenPlannerResponse
  | MealPlanResponse;

export interface SignupRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface UserPreferencesUpdateRequest {
  healthConditions: string[];
  dietaryPreference: DietaryPreference;
  defaultUnitMode: DefaultUnitMode;
  defaultServingSize: number;
}

export type UserPreferencesUpdate = UserPreferencesUpdateRequest;

export interface RecipeSearchParams {
  search?: string;
  tag?: string;
  dietaryTag?: string;
  allergenExclude?: string[];
  cuisine?: string;
  maxCost?: number;
  includeUnknownCost?: boolean;
  difficulty?: Difficulty;
  quickAndEasy?: boolean;
  maxTotalTimeMinutes?: number;
  page?: number;
  pageSize?: number;
  includeNeedsReview?: boolean;
}

export interface ShoppingListItemCreateRequest {
  recipeId?: string | null;
  name: string;
  canonicalIngredientName?: string | null;
  emoji?: string | null;
  quantity?: string | null;
  unit?: string | null;
  category?: string | null;
  estimatedPrice?: number | null;
}

export type ShoppingListItemCreate = ShoppingListItemCreateRequest;

export interface ShoppingListItemUpdateRequest {
  checked?: boolean;
  quantity?: string | null;
  estimatedPrice?: number | null;
  name?: string;
  category?: string | null;
}

export type ShoppingListItemUpdate = ShoppingListItemUpdateRequest;

export interface BudgetPlannerRequest {
  budget: number;
  mealsPerDay?: number;
  days?: number;
  dietaryPreference?: DietaryPreference;
  healthConditions?: string[];
  allowUnknownCost?: boolean;
}

export interface KitchenPlannerRequest {
  ingredients: string[];
}

export interface TimetablePlannerRequest {
  days?: number;
  mealsPerDay?: number;
  dietaryPreference?: DietaryPreference;
}

export interface MealPlanRequest extends TimetablePlannerRequest {
  healthConditions?: string[];
  avoidRecipeIds?: string[];
}

export interface HealthResponse {
  status: "ok";
  service: string;
  timestamp: ISODateTimeString;
}
