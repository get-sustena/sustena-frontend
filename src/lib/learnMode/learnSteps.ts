// Shared by the app and its tests, so nothing here imports React Native.
import type {
  RecipeIngredient,
  RecipeInstruction,
  RecipeInstructionTimer,
} from "../../types/api";
// The .ts extension lets the unit tests load this file in Node.
import { detectTimerPhrases } from "../recipeTimers.ts";

// Where a timer's time sits in the step text, so it can be highlighted and
// tapped. "for 15 minutes" highlights "15 minutes".
export type TextRange = { start: number; end: number };

export type LearnTimer = {
  minSeconds: number;
  maxSeconds: number | null;
  range: TextRange | null;
};

export type LearnIngredient = {
  id: string;
  name: string;
  ingredientId: string | null;
};

export type LearnStep = {
  name: string;
  text: string;
  tip: string | null;
  mistake: string | null;
  timers: LearnTimer[];
  ingredients: LearnIngredient[];
};

type LearnInstruction = Pick<
  RecipeInstruction,
  "stepNumber" | "stepName" | "commonMistake" | "helpfulTip" | "segments" | "timers"
> & {
  // The step text as the recipe page shows it, scaled to the servings and
  // units chosen.
  displayText: string;
};

// PRD v6.8 section 17. A part with no data is left empty so the card hides it.
export function buildLearnSteps(
  instructions: LearnInstruction[],
  ingredients: RecipeIngredient[]
): LearnStep[] {
  return [...instructions]
    .sort((left, right) => left.stepNumber - right.stepNumber)
    .map((instruction) => ({
      name: instruction.stepName?.trim() || `Step ${instruction.stepNumber}`,
      text: instruction.displayText,
      tip: instruction.helpfulTip?.trim() || null,
      mistake: instruction.commonMistake?.trim() || null,
      timers: getStepTimers(instruction.displayText, instruction.timers),
      ingredients: getStepIngredients(instruction, ingredients),
    }));
}

// The backend's confirmed timers where a step has them; otherwise the times
// written in the step, found the way the recipe editor finds them.
function getStepTimers(text: string, confirmed: RecipeInstructionTimer[]): LearnTimer[] {
  const written = detectTimerPhrases(text).map((phrase) => ({
    minSeconds: phrase.durationMinSeconds,
    maxSeconds: phrase.durationMaxSeconds ?? null,
    range: timeRange(phrase.sourceText ?? "", phrase.sourceStart ?? 0),
  }));
  if (!confirmed.length) return written;

  const unused = [...written];
  return [...confirmed]
    .sort((left, right) => left.position - right.position)
    .map((timer) => {
      // Highlight the written time that says the same, if there is one.
      const match = unused.findIndex(
        (phrase) =>
          phrase.minSeconds === timer.durationMinSeconds &&
          phrase.maxSeconds === (timer.durationMaxSeconds ?? null)
      );
      const range = match >= 0 ? unused.splice(match, 1)[0].range : null;
      return {
        minSeconds: timer.durationMinSeconds,
        maxSeconds: timer.durationMaxSeconds ?? null,
        range,
      };
    });
}

function timeRange(sourceText: string, sourceStart: number): TextRange {
  const lead = /^for\s+/i.exec(sourceText)?.[0].length ?? 0;
  return { start: sourceStart + lead, end: sourceStart + sourceText.length };
}

// "Ingredients in this step": each ingredient the step's quantity segments
// point to, once, in the order the step mentions them.
function getStepIngredients(
  instruction: Pick<RecipeInstruction, "segments">,
  ingredients: RecipeIngredient[]
): LearnIngredient[] {
  const byPosition = new Map(ingredients.map((ingredient) => [ingredient.position, ingredient]));
  const seen = new Set<number>();
  const found: LearnIngredient[] = [];

  for (const segment of instruction.segments) {
    if (segment.type !== "quantity" || seen.has(segment.ingredientPosition)) continue;
    const ingredient = byPosition.get(segment.ingredientPosition);
    if (!ingredient) continue;
    seen.add(segment.ingredientPosition);
    found.push({
      id: ingredient.id,
      name: ingredient.ingredientName ?? ingredient.canonicalIngredientName ?? ingredient.rawText,
      ingredientId: ingredient.ingredientId,
    });
  }
  return found;
}
