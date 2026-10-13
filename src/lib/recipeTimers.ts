// Shared by the app and its tests, so nothing here imports React Native.
import type { RecipeTimerInput } from "../types/api";

// Times written in a step, such as "15 minutes", "for 2-3 mins" or "1 hour".
const TIMER_PHRASE_RE =
  /\b(?:for\s+)?(\d+(?:\.\d+)?)(?:\s*(?:-|–|to)\s*(\d+(?:\.\d+)?))?\s*(seconds?|secs?|minutes?|mins?|hours?|hrs?)\b/gi;

// The times in a step's text, in order, with where each phrase sits. The
// recipe editor turns them into timers; Learn mode uses them for steps that
// have no confirmed timers.
export function detectTimerPhrases(text: string): RecipeTimerInput[] {
  const matches: RecipeTimerInput[] = [];
  TIMER_PHRASE_RE.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = TIMER_PHRASE_RE.exec(text)) !== null) {
    const minimum = Number(match[1]);
    const maximum = match[2] ? Number(match[2]) : null;
    const multiplier = timerUnitMultiplier(match[3]);
    matches.push({
      position: matches.length,
      label: null,
      durationMinSeconds: Math.round(minimum * multiplier),
      durationMaxSeconds:
        maximum === null ? null : Math.round(maximum * multiplier),
      sourceText: match[0],
      sourceStart: match.index,
      sourceEnd: match.index + match[0].length,
      resolutionStatus: "detected",
    });
  }
  return matches;
}

function timerUnitMultiplier(unit: string) {
  const normalized = unit.toLowerCase();
  if (normalized.startsWith("hour") || normalized.startsWith("hr")) return 3600;
  if (normalized.startsWith("minute") || normalized.startsWith("min")) return 60;
  return 1;
}
