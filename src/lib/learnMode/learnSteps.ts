// Shared by the app and its tests, so nothing here imports React Native.
import type {
  RecipeIngredient,
  RecipeInstruction,
  RecipeTimerSource,
} from "../../types/api";
// The .ts extension lets the unit tests load this file in Node.
import { detectTimerPhrases } from "../recipeTimers.ts";

// Where a timer's time sits in the step text, so it can be highlighted and
// tapped. "for 15 minutes" highlights "15 minutes".
type TextRange = { start: number; end: number };

// One timer per duration; a step that says the same time twice highlights
// both places, and either starts it.
export type LearnTimer = {
  minSeconds: number;
  maxSeconds: number | null;
  ranges: TextRange[];
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

export type LearnInstruction = Pick<
  RecipeInstruction,
  "stepNumber" | "stepName" | "text" | "commonMistake" | "helpfulTip" | "segments" | "timers"
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
      timers: getStepTimers(instruction),
      ingredients: getStepIngredients(instruction, ingredients),
    }));
}

// The backend's confirmed timers where a step has them; otherwise the times
// written in the step, found the way the recipe editor finds them.
function getStepTimers(instruction: LearnInstruction): LearnTimer[] {
  const { displayText } = instruction;
  const written = detectTimerPhrases(displayText).map((phrase) => ({
    minSeconds: phrase.durationMinSeconds,
    maxSeconds: phrase.durationMaxSeconds ?? null,
    ranges: [timeRange(phrase.sourceText ?? "", phrase.sourceStart ?? 0)],
  }));
  if (!instruction.timers.length) return written;

  const unmatched = [...written];
  return [...instruction.timers]
    .sort((left, right) => left.position - right.position)
    .map((timer) => {
      const minSeconds = timer.durationMinSeconds;
      const maxSeconds = timer.durationMaxSeconds ?? null;
      const fromSources = sourceRanges(timer.sources ?? [], instruction.text, displayText);
      if (fromSources.length) return { minSeconds, maxSeconds, ranges: fromSources };

      // Older APIs send no sources: highlight the written time that says the same.
      const match = unmatched.findIndex(
        (phrase) => phrase.minSeconds === minSeconds && phrase.maxSeconds === maxSeconds
      );
      const ranges = match >= 0 ? unmatched.splice(match, 1)[0].ranges : [];
      return { minSeconds, maxSeconds, ranges };
    });
}

function timeRange(sourceText: string, sourceStart: number): TextRange {
  const lead = /^for\s+/i.exec(sourceText)?.[0].length ?? 0;
  return { start: sourceStart + lead, end: sourceStart + sourceText.length };
}

// A timer's places in the text shown. The offsets point into the step's own
// text; when the shown text is scaled to other servings or units, each time
// is found by its words instead, in order.
function sourceRanges(sources: RecipeTimerSource[], text: string, displayText: string): TextRange[] {
  if (displayText === text) {
    return sources.flatMap(({ text: phrase, start, end }) =>
      start !== null && end !== null && text.slice(start, end) === phrase
        ? [timeRange(phrase, start)]
        : []
    );
  }

  const ranges: TextRange[] = [];
  let searchFrom = 0;
  for (const { text: phrase } of sources) {
    const at = displayText.indexOf(phrase, searchFrom);
    if (at < 0) continue;
    ranges.push(timeRange(phrase, at));
    searchFrom = at + phrase.length;
  }
  return ranges;
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
