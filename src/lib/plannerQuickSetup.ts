export const VALID_HABIT_WHO = new Set([
  "me",
  "partner",
  "family",
  "friends",
  "varies",
]);

export const VALID_HABIT_TIME = new Set([
  "15",
  "15-30",
  "30-45",
  "45-60",
  "60+",
]);

export const SERVINGS_BY_HABIT_WHO: Record<string, number> = {
  me: 1,
  partner: 2,
  family: 4,
  friends: 4,
  varies: 2,
};

export const TIME_CAP_BY_HABIT: Record<string, number> = {
  "15": 15,
  "15-30": 30,
  "30-45": 45,
  "45-60": 60,
  "60+": Number.POSITIVE_INFINITY,
};

export function finiteTimeCap(habitTime: string | null): number | undefined {
  if (!habitTime) return undefined;
  const value = TIME_CAP_BY_HABIT[habitTime];
  return Number.isFinite(value) ? value : undefined;
}
