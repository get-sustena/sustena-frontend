// src/lib/passwordStrength.ts

export type PasswordCriteria = {
  length: boolean;
  upper: boolean;
  lower: boolean;
  number: boolean;
  symbol: boolean;
};

export function getPasswordCriteria(password: string): PasswordCriteria {
  return {
    length: password.length >= 8,
    upper: /[A-Z]/.test(password),
    lower: /[a-z]/.test(password),
    number: /[0-9]/.test(password),
    symbol: /[^A-Za-z0-9]/.test(password),
  };
}

export function getPasswordScore(password: string): number {
  const criteria = getPasswordCriteria(password);
  return Object.values(criteria).filter(Boolean).length;
}

export type PasswordLevel = {
  label: string;
  color: string;
  segmentsLit: number;
};

const LEVEL_BY_SCORE: PasswordLevel[] = [
  { label: "", color: "#EDF2E3", segmentsLit: 0 },
  { label: "Weak", color: "#C0392E", segmentsLit: 1 },
  { label: "Fair", color: "#E3A62E", segmentsLit: 2 },
  { label: "Good", color: "#E3A62E", segmentsLit: 3 },
  { label: "Strong", color: "#34B673", segmentsLit: 4 },
  { label: "Very strong", color: "#1f7048", segmentsLit: 4 },
];

export function getPasswordLevel(password: string): PasswordLevel {
  const score = getPasswordScore(password);
  return LEVEL_BY_SCORE[Math.min(score, LEVEL_BY_SCORE.length - 1)];
}
