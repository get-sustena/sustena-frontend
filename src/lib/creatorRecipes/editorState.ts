import {
  RecipeClassification,
  RecipeClassificationInput,
  RecipeDraft,
  RecipeDraftWriteRequest,
  RecipeIngredientInput,
  RecipeIngredientSectionInput,
  RecipeInstructionInput,
  RecipeServingSuggestionInput,
  RecipeSubstitutionInput,
  RecipeTimerInput,
} from "../../types/api";
import { createLocalId } from "../id";
import { detectTimerPhrases } from "../recipeTimers";

type ClassificationKind = RecipeClassification["kind"];

export type RecipeEditorState = {
  name: string;
  description: string | null;
  coverMediaId: string | null;
  classifications: RecipeClassificationInput[];
  difficulty: "easy" | "medium" | "hard" | null;
  prepTimeMinutes: number | null;
  cookTimeMinutes: number | null;
  baseServings: number | null;
  estimatedCost: number | null;
  affordabilityBand: "low" | "moderate" | "expensive" | null;
  affordabilityBasis: "meal" | "snack" | null;
  ingredientSections: RecipeIngredientSectionInput[];
  ingredients: RecipeIngredientInput[];
  instructions: RecipeInstructionInput[];
  servingSuggestions: RecipeServingSuggestionInput[];
  substitutions: RecipeSubstitutionInput[];
  storageInstructions: string | null;
  editorStage: number;
};

export type RecipeEditorValidationError = {
  stage: number;
  field: string;
  message: string;
};

const BASE_OPTIONAL_CATEGORIES = new Set([
  "fruit-juice",
  "smoothie",
  "dessert",
  "local-drink",
]);

export function editorStateFromRecipe(recipe: RecipeDraft): RecipeEditorState {
  return editorStateFromWriteRequest(recipe);
}

export function editorStateFromWriteRequest(
  recipe: RecipeDraftWriteRequest
): RecipeEditorState {
  const ingredientSections = recipe.ingredientSections ?? [];
  return normalizeEditorState({
    name: recipe.name,
    description: recipe.description ?? null,
    coverMediaId: recipe.coverMediaId ?? null,
    classifications: recipe.classifications ?? [],
    difficulty: recipe.difficulty ?? null,
    prepTimeMinutes: recipe.prepTimeMinutes ?? null,
    cookTimeMinutes: recipe.cookTimeMinutes ?? null,
    baseServings: recipe.baseServings ?? 2,
    estimatedCost: recipe.estimatedCost ?? null,
    affordabilityBand: recipe.affordabilityBand ?? null,
    affordabilityBasis: recipe.affordabilityBasis ?? "meal",
    ingredientSections:
      ingredientSections.length > 0
        ? ingredientSections
        : [{ name: "Main ingredients", position: 0 }],
    ingredients: recipe.ingredients ?? [],
    instructions: recipe.instructions ?? [],
    servingSuggestions: recipe.servingSuggestions ?? [],
    substitutions: recipe.substitutions ?? [],
    storageInstructions: recipe.storageInstructions ?? null,
    editorStage: recipe.editorStage ?? 1,
  });
}

export function normalizeEditorState(
  state: RecipeEditorState
): RecipeEditorState {
  const ingredientSections = state.ingredientSections.map((section, index) => ({
    ...section,
    name: section.name.trim() || `Section ${index + 1}`,
    position: index,
  }));
  const sectionPositionMap = new Map(
    state.ingredientSections.map((section, index) => [section.position, index])
  );
  const ingredients = state.ingredients.map((ingredient, index) => ({
    ...ingredient,
    clientId: ingredient.clientId ?? createLocalId("ingredient"),
    position: index,
    sectionPosition:
      ingredient.sectionPosition === null ||
      ingredient.sectionPosition === undefined
        ? 0
        : (sectionPositionMap.get(ingredient.sectionPosition) ?? 0),
  }));
  const instructions = state.instructions.map((instruction, index) => ({
    ...instruction,
    clientId: instruction.clientId ?? createLocalId("step"),
    stepNumber: index + 1,
    timers: (instruction.timers ?? []).map((timer, timerIndex) => ({
      ...timer,
      position: timerIndex,
    })),
  }));

  return {
    ...state,
    classifications: normalizeClassifications(state.classifications),
    ingredientSections,
    ingredients,
    instructions,
    servingSuggestions: state.servingSuggestions.map((suggestion, index) => ({
      ...suggestion,
      position: index,
    })),
    substitutions: state.substitutions.map((substitution, index) => ({
      ...substitution,
      position: index,
    })),
    editorStage: Math.max(1, Math.min(5, state.editorStage)),
  };
}

export function toRecipeDraftWriteRequest(
  state: RecipeEditorState,
  revision: number | null,
  options: { sanitize?: boolean } = {}
): RecipeDraftWriteRequest {
  const normalized = normalizeEditorState(state);
  const sanitize = options.sanitize ?? true;
  return {
    revision,
    ...normalized,
    description: normalized.description?.trim() || null,
    storageInstructions: normalized.storageInstructions?.trim() || null,
    servingSuggestions: sanitize
      ? normalized.servingSuggestions.filter(hasServingSuggestion)
      : normalized.servingSuggestions,
    substitutions: sanitize
      ? normalized.substitutions.filter(isCompleteSubstitution)
      : normalized.substitutions,
  };
}

export function hasIncompleteLocalRows(state: RecipeEditorState) {
  return state.servingSuggestions.some(
    (item) => !item.relatedRecipeId && !item.label?.trim()
  ) || state.substitutions.some((item) => {
    const hasSource = Boolean(
      item.sourceIngredientClientId ||
        (item.sourceIngredientPosition !== null &&
          item.sourceIngredientPosition !== undefined)
    );
    const hasReplacement = Boolean(
      item.replacementIngredientId || item.replacementName?.trim()
    );
    return !hasSource || !hasReplacement;
  });
}

export function getClassificationValues(
  state: RecipeEditorState,
  kind: ClassificationKind
) {
  return state.classifications
    .filter((item) => item.kind === kind)
    .sort((left, right) => left.position - right.position)
    .map((item) => item.value);
}

export function setClassificationValues(
  state: RecipeEditorState,
  kind: ClassificationKind,
  values: string[]
): RecipeEditorState {
  return {
    ...state,
    classifications: normalizeClassifications([
      ...state.classifications.filter((item) => item.kind !== kind),
      ...values.map((value, position) => ({ kind, value, position })),
    ]),
  };
}

export function validateRecipeEditor(
  state: RecipeEditorState
): RecipeEditorValidationError[] {
  const errors: RecipeEditorValidationError[] = [];
  const require = (
    condition: unknown,
    stage: number,
    field: string,
    message: string
  ) => {
    if (!condition) errors.push({ stage, field, message });
  };
  const categories = getClassificationValues(state, "category");
  const bases = getClassificationValues(state, "main_ingredient_base");
  const baseIsOptional =
    categories.length > 0 &&
    categories.every((category) => BASE_OPTIONAL_CATEGORIES.has(category));

  require(state.name.trim(), 1, "name", "Enter a recipe name.");
  require(categories.length, 1, "categories", "Choose at least one recipe category.");
  require(
    baseIsOptional || bases.length,
    1,
    "mainIngredientBases",
    "Choose at least one main ingredient base."
  );
  require(
    getClassificationValues(state, "cuisine").length,
    1,
    "cuisines",
    "Choose at least one cuisine or tribe."
  );
  require(
    getClassificationValues(state, "occasion").length,
    2,
    "occasions",
    "Choose at least one occasion."
  );
  require(state.difficulty, 2, "difficulty", "Choose a difficulty level.");
  require(
    state.prepTimeMinutes !== null,
    2,
    "prepTimeMinutes",
    "Enter the preparation time in minutes."
  );
  require(
    state.cookTimeMinutes !== null,
    2,
    "cookTimeMinutes",
    "Enter the cooking time in minutes."
  );
  require(state.baseServings, 2, "baseServings", "Enter servings.");
  require(
    getClassificationValues(state, "cooking_method").length,
    2,
    "cookingMethods",
    "Choose at least one cooking method."
  );
  require(
    state.estimatedCost !== null,
    2,
    "estimatedCost",
    "Enter the estimated total cost."
  );
  require(
    state.affordabilityBand,
    2,
    "affordabilityBand",
    "Choose an affordability level."
  );
  require(state.ingredients.length, 3, "ingredients", "Add at least one ingredient.");

  state.ingredients.forEach((ingredient, index) => {
    if (ingredient.isCustom) {
      require(
        ingredient.ingredientName?.trim(),
        3,
        `ingredients.${index}.ingredientName`,
        `Enter a name for ingredient ${index + 1}.`
      );
      require(
        ingredient.customMeasurementBasis,
        3,
        `ingredients.${index}.customMeasurementBasis`,
        `Choose a measurement basis for ingredient ${index + 1}.`
      );
    } else {
      require(
        ingredient.ingredientId,
        3,
        `ingredients.${index}.ingredientId`,
        `Choose ingredient ${index + 1} from the catalogue.`
      );
    }
    if (ingredient.quantityMode === "range") {
      require(
        ingredient.quantity,
        3,
        `ingredients.${index}.quantity`,
        `Enter the start of the range for ingredient ${index + 1}.`
      );
      require(
        ingredient.quantityMax,
        3,
        `ingredients.${index}.quantityMax`,
        `Enter the end of the range for ingredient ${index + 1}.`
      );
      if (
        ingredient.quantity &&
        ingredient.quantityMax &&
        Number(ingredient.quantityMax) <= Number(ingredient.quantity)
      ) {
        errors.push({
          stage: 3,
          field: `ingredients.${index}.quantityMax`,
          message: `The range end for ingredient ${index + 1} must be greater than the start.`,
        });
      }
    }
    if (ingredient.quantityMode === "exact" && ingredient.quantity) {
      require(
        ingredient.unit,
        3,
        `ingredients.${index}.unit`,
        `Choose a unit for ingredient ${index + 1}.`
      );
    }
  });

  const startedInstructions = state.instructions.filter(
    (instruction) => instruction.stepName?.trim() || instruction.text.trim()
  );
  require(
    startedInstructions.length,
    4,
    "instructions",
    "Add at least one cooking step."
  );
  startedInstructions.forEach((instruction) => {
    const index = state.instructions.indexOf(instruction);
    require(
      instruction.stepName?.trim(),
      4,
      `instructions.${index}.stepName`,
      `Enter a title for step ${index + 1}.`
    );
    require(
      instruction.text.trim(),
      4,
      `instructions.${index}.text`,
      `Enter instructions for step ${index + 1}.`
    );
    const timers = instruction.timers ?? [];
    timers
      .filter((timer) => timer.resolutionStatus === "detected")
      .forEach(() => {
        errors.push({
          stage: 4,
          field: `instructions.${index}.timers`,
          message: `Resolve all timer suggestions in step ${index + 1}.`,
        });
      });
    detectTimerPhrases(instruction.text).forEach((phrase) => {
      if (!timers.some((timer) => timer.sourceText === phrase.sourceText)) {
        errors.push({
          stage: 4,
          field: `instructions.${index}.timers`,
          message: `Resolve the timed phrase in step ${index + 1}: ${phrase.sourceText}.`,
        });
      }
    });
  });

  state.substitutions.forEach((substitution, index) => {
    const started = Object.values(substitution).some(
      (value) => value !== null && value !== undefined && value !== "" && value !== index
    );
    if (!started) return;
    require(
      substitution.sourceIngredientClientId !== null &&
        substitution.sourceIngredientClientId !== undefined ||
        substitution.sourceIngredientPosition !== null &&
          substitution.sourceIngredientPosition !== undefined,
      5,
      `substitutions.${index}.source`,
      `Choose the ingredient being replaced in substitution ${index + 1}.`
    );
    require(
      substitution.replacementIngredientId || substitution.replacementName?.trim(),
      5,
      `substitutions.${index}.replacement`,
      `Enter the replacement for substitution ${index + 1}.`
    );
  });
  require(
    state.storageInstructions?.trim(),
    5,
    "storageInstructions",
    "Enter storage instructions, or note that this dish is best eaten fresh."
  );

  return errors;
}

export function syncInstructionTimers(
  instruction: RecipeInstructionInput,
  text: string
): RecipeInstructionInput {
  const current = instruction.timers ?? [];
  const manual = current.filter((timer) => !timer.sourceText);
  const detected = detectTimerPhrases(text).map((phrase) => {
    const existing = current.find(
      (timer) => timer.sourceText === phrase.sourceText
    );
    return existing ? { ...existing, ...phrase } : phrase;
  });

  return {
    ...instruction,
    text,
    timers: [...detected, ...manual].map((timer, position) => ({
      ...timer,
      position,
    })),
  };
}

export function describeTimer(timer: RecipeTimerInput) {
  const range = timer.durationMaxSeconds
    ? `${formatDuration(timer.durationMinSeconds)} to ${formatDuration(
        timer.durationMaxSeconds
      )}`
    : formatDuration(timer.durationMinSeconds);
  return timer.label?.trim() ? `${timer.label}: ${range}` : range;
}

export function getAffordabilitySuggestion(state: RecipeEditorState) {
  if (
    state.estimatedCost === null ||
    !state.baseServings
  ) {
    return null;
  }
  const perServing = Math.round(state.estimatedCost / state.baseServings);
  const thresholds =
    state.affordabilityBasis === "snack" ? [400, 800] : [1000, 2000];
  const band =
    perServing <= thresholds[0]
      ? "low"
      : perServing <= thresholds[1]
        ? "moderate"
        : "expensive";
  return { perServing, band } as const;
}

function normalizeClassifications(items: RecipeClassificationInput[]) {
  const positions = new Map<ClassificationKind, number>();
  const seen = new Set<string>();
  return items.flatMap((item) => {
    const key = `${item.kind}:${item.value}`;
    if (seen.has(key)) return [];
    seen.add(key);
    const position = positions.get(item.kind) ?? 0;
    positions.set(item.kind, position + 1);
    return [{ ...item, position }];
  });
}

function hasServingSuggestion(item: RecipeServingSuggestionInput) {
  return Boolean(item.relatedRecipeId || item.label?.trim());
}

function isCompleteSubstitution(item: RecipeSubstitutionInput) {
  const hasSource =
    item.sourceIngredientClientId !== null &&
      item.sourceIngredientClientId !== undefined ||
    item.sourceIngredientPosition !== null &&
      item.sourceIngredientPosition !== undefined;
  return Boolean(
    hasSource && (item.replacementIngredientId || item.replacementName?.trim())
  );
}


function formatDuration(seconds: number) {
  if (seconds % 3600 === 0) {
    const hours = seconds / 3600;
    return `${hours} ${hours === 1 ? "hour" : "hours"}`;
  }
  if (seconds % 60 === 0) {
    const minutes = seconds / 60;
    return `${minutes} ${minutes === 1 ? "minute" : "minutes"}`;
  }
  return `${seconds} ${seconds === 1 ? "second" : "seconds"}`;
}
