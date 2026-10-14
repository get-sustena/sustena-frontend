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
export type BudgetMealSlot = "breakfast" | "lunch" | "dinner";
export type RecipePublicationStatus = "draft" | "published" | "archived";
export type RecipeModerationStatus =
  | "pending"
  | "approved"
  | "hidden"
  | "rejected";
type UnitOptionSource =
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
  isAdmin: boolean;
  emailVerifiedAt: ISODateTimeString | null;
  createdAt: ISODateTimeString;
  updatedAt: ISODateTimeString;
}

export interface CurrentUserUpdateRequest {
  fullName: string;
  email: string;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  tokenType: "bearer";
  user: User;
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

export interface PlannerSettings {
  days: number;
  mealSlots: BudgetMealSlot[];
  mealsPerDay: number;
}

export interface PlannerSettingsUpdateRequest {
  days: number;
  mealSlots: BudgetMealSlot[];
  mealsPerDay: number;
}

export interface UserProfileAnswers {
  id: UUIDString;
  userId: UUIDString;
  nickname: string | null;
  gender: string | null;
  birthdayMonth: number | null;
  birthdayDay: number | null;
  lifestyle: string | null;
  remoteFlex: string | null;
  experience: string | null;
  goals: string[];
  challenges: string[];
  habitWho: string | null;
  habitFreq: string | null;
  habitTime: string | null;
  heard: string | null;
  heardOther: string | null;
  createdAt: ISODateTimeString;
  updatedAt: ISODateTimeString;
}

export interface UserProfileAnswersUpdateRequest {
  nickname?: string | null;
  gender?: string | null;
  birthdayMonth?: number | null;
  birthdayDay?: number | null;
  lifestyle?: string | null;
  remoteFlex?: string | null;
  experience?: string | null;
  goals?: string[];
  challenges?: string[];
  habitWho?: string | null;
  habitFreq?: string | null;
  habitTime?: string | null;
  heard?: string | null;
  heardOther?: string | null;
}

export interface RecipeListItem {
  id: string;
  name: string;
  slug: string;
  imageUrl: string | null;
  cuisine: string | null;
  tags: string[];
  dietaryTags: string[];
  categories: string[];
  estimatedCost: number | null;
  baseServings: number | null;
  caloriesPerServing: number | null;
  totalTimeMinutes: number | null;
  difficulty: Difficulty | null;
  reviewStatus: ReviewStatus;
  creator: RecipeCreatorSummary | null;
  averageRating: number | null;
  ratingCount: number;
  isFavorited: boolean;
}

export interface RecipeRecommendation {
  recipe: RecipeListItem;
  score: number;
  pantryMatchPercentage: number;
  matchedPantryIngredientCount: number;
  reasons: string[];
}

export interface RecommendationListResponse {
  items: RecipeRecommendation[];
  pantryIngredientCount: number;
  personalized: boolean;
}

export interface RecipeCreatorSummary {
  id: UUIDString;
  displayName: string;
  handle: string;
  avatarUrl: string | null;
}

export interface IngredientAvailableUnit {
  quantity: DecimalString | number | null;
  unit: string | null;
  label: string;
  source: UnitOptionSource;
  confidence: DecimalString | number;
}

export type IngredientConversionContext =
  | "mass"
  | "volume"
  | "count"
  | "rice"
  | "plain_flour"
  | "millet"
  | "sorghum"
  | "seasoning_cube";

export interface IngredientLocalName {
  name: string;
  languageOrRegion: string | null;
}

export interface Ingredient {
  id: string;
  canonicalName: string;
  displayName: string;
  categoryId: string | null;
  categoryName: string | null;
  subcategory: string | null;
  aliases: string[];
  localNames: IngredientLocalName[];
  searchTerms: string[];
  defaultMeasurementBasis: string | null;
  conversionContext: IngredientConversionContext;
  storageZone: string | null;
  allergenGroup: string | null;
  isCommonNigeria: boolean;
  isCommonUsUk: boolean;
  isActive: boolean;
  notes: string | null;
  createdAt: ISODateTimeString;
  updatedAt: ISODateTimeString;
}

export interface IngredientSearchParams {
  search?: string;
  limit?: number;
  offset?: number;
}

export interface PantryItem {
  ingredientId: string;
  ingredient: Ingredient;
  createdAt: ISODateTimeString;
  updatedAt: ISODateTimeString;
}

// GET /me/start: what the app loads when it opens, in one request. Each part
// has the same shape as its own request.
export interface StartResponse {
  user: User;
  preferences: UserPreferences;
  profileAnswers: UserProfileAnswers;
  plannerSettings: PlannerSettings;
  pantry: PantryResponse;
  shoppingLists: ShoppingList[];
  recommendations: RecommendationListResponse;
  // The ingredient catalogue's ETag without its quotes.
  ingredientCatalogueVersion: string;
  // The recipe catalogue's ETag without its quotes (OFF-01). Missing from an
  // API older than the recipe catalogue.
  recipeCatalogueVersion?: string;
  // The recommended recipe for each meal of the next 14 days (Lagos dates),
  // for Home with no connection.
  mealPicks?: MealPicksForDay[];
}

export interface MealPicksForDay {
  date: string;
  breakfast: string | null;
  lunch: string | null;
  dinner: string | null;
}

export interface PantryResponse {
  items: PantryItem[];
}

export interface Unit {
  id: string;
  name: string;
  context: string;
  baseUnit: string;
  baseFactorMin: DecimalString | number;
  baseFactorMax: DecimalString | number;
  isApproximate: boolean;
  precisionLabel: string | null;
  scope: string | null;
  sourceId: string | null;
}

// PRD v6.8 section 15. Carbs already include fibre.
export interface NutrientValues {
  kcal: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  fibreG: number;
  saturatedFatG: number;
  sodiumMg: number;
  vitaminCMg: number;
}

export interface RecipeIngredient {
  // For the line's amount at the recipe's base servings; null when it isn't
  // counted (salt to taste, or no nutrition data yet). Older APIs send none.
  nutrition?: NutrientValues | null;
  // Deep-frying oil, counted as only what the food soaks up.
  isFryingOil?: boolean;
  id: UUIDString;
  position: number;
  rawText: string;
  ingredientName: string | null;
  canonicalIngredientName: string | null;
  ingredientId: string | null;
  quantity: DecimalString | number | null;
  quantityMax: DecimalString | number | null;
  quantityMode: "exact" | "range" | "to_taste" | "as_needed";
  unit: string | null;
  quantityText: string | null;
  displayText: string | null;
  alternateQuantity: DecimalString | number | null;
  alternateUnit: string | null;
  availableUnits: IngredientAvailableUnit[];
  preparationNote: string | null;
  sizeNote: string | null;
  customMeasurementBasis: "mass" | "liquid" | "item" | "bunch" | null;
  isCustom: boolean;
  sectionPosition: number | null;
  category: string | null;
  isCoreIngredient: boolean;
  isOptional: boolean;
  parseConfidence: DecimalString | number | null;
  parseWarnings: string[];
}

interface RecipeInstructionTextSegment {
  type: "text";
  text: string;
}

export interface RecipeInstructionQuantitySegment {
  type: "quantity";
  text: string;
  recipeIngredientId: UUIDString | null;
  ingredientPosition: number;
  baseQuantity: DecimalString;
  unit: string | null;
  scalesWithServings: true;
}

export type RecipeInstructionSegment =
  | RecipeInstructionTextSegment
  | RecipeInstructionQuantitySegment;

export interface RecipeInstruction {
  id: UUIDString;
  stepNumber: number;
  stepName: string | null;
  text: string;
  commonMistake: string | null;
  helpfulTip: string | null;
  type: string;
  segments: RecipeInstructionSegment[];
  timers: RecipeInstructionTimer[];
}

export interface RecipeTimerSource {
  text: string;
  // UTF-16 offsets into the instruction's text; null when the saved place
  // no longer matches.
  start: number | null;
  end: number | null;
}

// One per duration in a step: a step that says 5 minutes twice has one
// 5-minute timer with two sources.
export interface RecipeInstructionTimer {
  id: UUIDString;
  position: number;
  label: string | null;
  durationMinSeconds: number;
  durationMaxSeconds: number | null;
  // Empty for a timer the creator added by hand. Missing from APIs older than
  // backend 3759465.
  sources?: RecipeTimerSource[];
}

export interface RecipeClassification {
  kind:
    | "category"
    | "main_ingredient_base"
    | "cuisine"
    | "occasion"
    | "cooking_method";
  value: string;
  position: number;
}

export interface RecipeIngredientSection {
  id: UUIDString;
  name: string;
  position: number;
}

export interface RecipeServingSuggestion {
  id: UUIDString;
  relatedRecipeId: string | null;
  label: string | null;
  position: number;
}

export interface RecipeSubstitution {
  id: UUIDString;
  sourceRecipeIngredientId: UUIDString | null;
  replacementIngredientId: string | null;
  replacementName: string | null;
  instruction: string | null;
  position: number;
}

export interface RecipeNote {
  id: UUIDString;
  text: string;
  type: string | null;
}

export interface RecipeDetail extends RecipeListItem {
  // 1 serving; null when nothing in the recipe can be counted.
  nutritionPerServing?: NutrientValues | null;
  description: string | null;
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
  classifications: RecipeClassification[];
  ingredientSections: RecipeIngredientSection[];
  servingSuggestions: RecipeServingSuggestion[];
  substitutions: RecipeSubstitution[];
  storageInstructions: string | null;
  viewCount: number;
  currentUserRating: number | null;
  canRate: boolean;
  createdAt: ISODateTimeString;
  updatedAt: ISODateTimeString;
}

export interface CreatorProfile {
  id: UUIDString;
  displayName: string;
  handle: string;
  bio: string | null;
  avatarUrl: string | null;
  coverUrl: string | null;
  specialities: string[];
  isOwner: boolean;
  isSaved: boolean;
  publishedRecipeCount: number;
  totalRecipeSaves: number;
  averageRating: number | null;
  createdAt: ISODateTimeString;
  updatedAt: ISODateTimeString;
}

export interface CreatorProfileWriteRequest {
  displayName: string;
  handle: string;
  bio?: string | null;
  avatarAssetId?: UUIDString | null;
  coverAssetId?: UUIDString | null;
  specialities: string[];
}

export interface CreatorHandleAvailability {
  handle: string;
  normalizedHandle: string;
  available: boolean;
  reason: "available" | "taken" | "reserved" | "invalid";
}

export interface CreatorReportRequest {
  reason: "spam" | "misleading" | "inappropriate" | "other";
  notes?: string | null;
}

export interface CreatorRecipeListParams {
  search?: string;
  category?: string;
  sort?: "newest" | "top_rated";
  page?: number;
  pageSize?: number;
}

export interface MyRecipeListParams {
  status?: RecipePublicationStatus;
  search?: string;
  page?: number;
  pageSize?: number;
}

export interface RecipeClassificationInput {
  kind: RecipeClassification["kind"];
  value: string;
  position: number;
}

export interface RecipeIngredientSectionInput {
  name: string;
  position: number;
}

export interface RecipeIngredientInput {
  clientId?: string | null;
  sectionPosition?: number | null;
  position: number;
  rawText?: string;
  ingredientName?: string | null;
  ingredientId?: string | null;
  quantity?: string | null;
  quantityMax?: string | null;
  quantityMode?: "exact" | "range" | "to_taste" | "as_needed";
  unit?: string | null;
  preparationNote?: string | null;
  sizeNote?: string | null;
  customMeasurementBasis?: "mass" | "liquid" | "item" | "bunch" | null;
  isCustom?: boolean;
  isOptional?: boolean;
}

export interface RecipeTimerInput {
  position: number;
  label?: string | null;
  durationMinSeconds: number;
  durationMaxSeconds?: number | null;
  sourceText?: string | null;
  sourceStart?: number | null;
  sourceEnd?: number | null;
  resolutionStatus?: "detected" | "confirmed" | "ignored";
}

export interface RecipeInstructionInput {
  clientId?: string | null;
  stepNumber: number;
  stepName?: string | null;
  text: string;
  commonMistake?: string | null;
  helpfulTip?: string | null;
  timers?: RecipeTimerInput[];
}

export interface RecipeServingSuggestionInput {
  relatedRecipeId?: string | null;
  label?: string | null;
  position: number;
}

export interface RecipeSubstitutionInput {
  sourceIngredientClientId?: string | null;
  sourceIngredientPosition?: number | null;
  replacementIngredientId?: string | null;
  replacementName?: string | null;
  instruction?: string | null;
  position: number;
}

export interface RecipeDraftWriteRequest {
  revision?: number | null;
  name: string;
  description?: string | null;
  coverMediaId?: UUIDString | null;
  classifications?: RecipeClassificationInput[];
  difficulty?: Difficulty | null;
  prepTimeMinutes?: number | null;
  cookTimeMinutes?: number | null;
  baseServings?: number | null;
  estimatedCost?: number | null;
  affordabilityBand?: "low" | "moderate" | "expensive" | null;
  affordabilityBasis?: "meal" | "snack" | null;
  ingredientSections?: RecipeIngredientSectionInput[];
  ingredients?: RecipeIngredientInput[];
  instructions?: RecipeInstructionInput[];
  servingSuggestions?: RecipeServingSuggestionInput[];
  substitutions?: RecipeSubstitutionInput[];
  storageInstructions?: string | null;
  editorStage?: number;
}

export interface RecipeDraftCreateRequest extends RecipeDraftWriteRequest {
  id?: string;
}

export interface RecipeDraft extends Required<Omit<RecipeDraftWriteRequest, "revision">> {
  id: string;
  revision: number;
  coverMediaUrl: string | null;
  slug: string;
  publicationStatus: RecipePublicationStatus;
  moderationStatus: RecipeModerationStatus;
  draftOfRecipeId: string | null;
  publishedAt: ISODateTimeString | null;
  deletedAt: ISODateTimeString | null;
  viewCount: number;
  createdAt: ISODateTimeString;
  updatedAt: ISODateTimeString;
}

export interface RecipeVocabularyItem {
  id: string;
  label: string;
  group: string | null;
}

export interface RecipeAuthoringVocabulary {
  categories: RecipeVocabularyItem[];
  mainIngredientBases: RecipeVocabularyItem[];
  cuisines: RecipeVocabularyItem[];
  occasions: RecipeVocabularyItem[];
  cookingMethods: RecipeVocabularyItem[];
}

export interface MediaUploadCreateRequest {
  purpose: "creator_avatar" | "creator_cover" | "recipe_cover";
  contentType: "image/jpeg" | "image/png" | "image/webp";
  originalFilename?: string | null;
  byteSize: number;
  checksumSha256: string;
}

export interface MediaUploadCompleteRequest {
  width: number;
  height: number;
}

export interface MediaAsset {
  id: UUIDString;
  purpose: string;
  status: "pending" | "ready" | "failed";
  storageKey: string;
  uploadUrl: string | null;
  uploadHeaders: Record<string, string>;
  uploadExpiresIn: number | null;
  publicUrl: string | null;
  contentType: string | null;
  originalFilename: string | null;
  byteSize: number | null;
  width: number | null;
  height: number | null;
  checksumSha256: string | null;
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
  ingredientId: string | null;
  name: string;
  canonicalIngredientName: string | null;
  emoji: string | null;
  quantity: string | null;
  amount: DecimalString | number | null;
  displayQuantity: string | null;
  unit: string | null;
  category: string | null;
  estimatedPrice: number | null;
  priceStatus: "unknown" | "estimated" | "confirmed";
  priceSource: string | null;
  pricedAt: ISODateTimeString | null;
  clientMutationId: string | null;
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
  knownSubtotal: number;
  unpricedItemCount: number;
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
  /** Percentage of the recipe's required ingredients the user has. */
  score: number;
  /** Backend ordering score: 50% recipe readiness and 50% pantry utilization. */
  rankingScore: number;
  matchedIngredientCount: number;
  totalRequiredIngredientCount: number;
  missingIngredientCount: number;
  matchedIngredients: string[];
  missingIngredients: string[];
}

export interface BudgetPlannerResponse {
  meals: PlannerMeal[];
  matches: [];
  days: number;
  mealSlots: BudgetMealSlot[];
  requestedMealCount: number;
  generatedMealCount: number;
  dailyBudget: number;
  totalBudget: number;
  totalEstimatedCost: number;
  message: string | null;
  recommendedBudget: number | null;
  shortfall: {
    reason:
      | "budget"
      | "maximum_cooking_time"
      | "dietary_preference"
      | "health_exclusion"
      | "avoided_recipes"
      | "insufficient_slot_recipes";
    requestedMealCount: number;
    generatedMealCount: number;
    recommendedBudget: number | null;
  } | null;
}

export interface KitchenPlannerResponse {
  meals: [];
  matches: KitchenPlannerMatch[];
  totalEstimatedCost: number;
}

export type SavedMealPlanType = "budget" | "timetable" | "pantry";
export type SavedMealPlanStatus = "active" | "archived";

export interface SavedMealPlanItemCreateRequest {
  recipeId: string;
  day: number;
  plannedDate?: ISODateString | null;
  mealSlot: MealSlot;
  servings: number;
  estimatedCost?: number | null;
}

export interface SavedMealPlanCreateRequest {
  name?: string | null;
  startDate?: ISODateString | null;
  endDate?: ISODateString | null;
  plannerType: SavedMealPlanType;
  budget?: number | null;
  servingSize: number;
  requestedMealCount: number;
  totalEstimatedCost?: number | null;
  shortfallReason?: string | null;
  recommendedBudget?: number | null;
  configuration?: Record<string, unknown>;
  items: SavedMealPlanItemCreateRequest[];
}

export interface SavedMealPlanItem {
  id: UUIDString;
  recipeId: string;
  day: number;
  position: number;
  plannedDate: ISODateString | null;
  mealSlot: MealSlot;
  servings: number;
  estimatedCost: number | null;
  recipe: RecipeListItem;
  createdAt: ISODateTimeString;
  updatedAt: ISODateTimeString;
}

export interface SavedMealPlan {
  id: UUIDString;
  userId: UUIDString;
  name: string | null;
  startDate: ISODateString | null;
  endDate: ISODateString | null;
  plannerType: SavedMealPlanType;
  status: SavedMealPlanStatus;
  budget: number | null;
  servingSize: number;
  requestedMealCount: number;
  generatedMealCount: number;
  totalEstimatedCost: number | null;
  shortfallReason: string | null;
  recommendedBudget: number | null;
  configuration: Record<string, unknown>;
  items: SavedMealPlanItem[];
  createdAt: ISODateTimeString;
  updatedAt: ISODateTimeString;
}

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

export interface ForgotPasswordRequest {
  email: string;
}

export interface ForgotPasswordResponse {
  success: boolean;
}

export interface VerifyResetCodeRequest {
  email: string;
  code: string;
}

export interface VerifyResetCodeResponse {
  resetToken: string;
  expiresIn: number;
}

export interface ResetPasswordRequest {
  resetToken: string;
  newPassword: string;
}

export interface ResetPasswordResponse {
  success: boolean;
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
  preferredMaxTotalTimeMinutes?: number;
  preferredDifficulty?: "beginner" | "intermediate" | "advanced" | "pro";
  page?: number;
  pageSize?: number;
}

export interface ShoppingListItemCreateRequest {
  recipeId?: string | null;
  ingredientId?: string | null;
  name: string;
  canonicalIngredientName?: string | null;
  emoji?: string | null;
  quantity?: string | null;
  amount?: DecimalString | number | null;
  displayQuantity?: string | null;
  unit?: string | null;
  category?: string | null;
  estimatedPrice?: number | null;
  priceStatus?: "unknown" | "estimated" | "confirmed";
  clientMutationId?: string | null;
}

export type ShoppingListItemCreate = ShoppingListItemCreateRequest;

export interface ShoppingListItemUpdateRequest {
  checked?: boolean;
  quantity?: string | null;
  amount?: DecimalString | number | null;
  displayQuantity?: string | null;
  unit?: string | null;
  estimatedPrice?: number | null;
  name?: string;
  category?: string | null;
  priceStatus?: "unknown" | "estimated" | "confirmed";
}

export interface ShoppingListRecipeBatchRequest {
  clientMutationId: string;
  recipes: {
    recipeId: string;
    servings: number;
    unitOverrides?: { ingredientId: string; unit: string }[];
  }[];
}

export type ShoppingListItemUpdate = ShoppingListItemUpdateRequest;

export type PushPlatform = "android" | "ios";

// A phone registered for meal reminders: POST /me/push-tokens.
export interface PushTokenRegisterRequest {
  token: string;
  platform: PushPlatform;
  timeZone: string;
}

export interface PushTokenResponse extends PushTokenRegisterRequest {
  createdAt: ISODateTimeString;
  updatedAt: ISODateTimeString;
}

export interface RecipeCookedResponse {
  recipeId: string;
  // False when this person's cook of this recipe was already counted today.
  counted: boolean;
}

export interface ShoppingListCreateRequest {
  name: string;
  isActive?: boolean;
}

export interface ShoppingListUpdateRequest {
  name?: string;
  isActive?: boolean;
}

export interface BudgetPlannerRequest {
  budget: number;
  days?: number;
  mealSlots?: BudgetMealSlot[];
  mealsPerDay?: number;
  servingSize?: number;
  maxTotalTimeMinutes?: number;
  dietaryPreference?: DietaryPreference;
  healthConditions?: string[];
  allowUnknownCost?: boolean;
  avoidRecipeIds?: string[];
}

export interface KitchenPlannerRequest {
  ingredientIds: string[];
  maxTotalTimeMinutes?: number;
}
