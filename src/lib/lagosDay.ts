// Shared by the app and its tests, so nothing here imports React Native.

// Lagos is UTC+1 all year, with no daylight saving. The backend counts a
// cook once per person, per recipe, per Lagos day.
const LAGOS_OFFSET_MS = 60 * 60 * 1000;

// The Lagos calendar day as YYYY-MM-DD.
export function getLagosDay(now: Date = new Date()): string {
  return new Date(now.getTime() + LAGOS_OFFSET_MS).toISOString().slice(0, 10);
}
