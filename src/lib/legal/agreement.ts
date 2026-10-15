// Who may use Sustena (v6.9, Terms of Service and Privacy Policy): 13 and
// over, and from 13 to 17 only with a parent's or guardian's agreement.
// Ages are counted on today's Lagos date (getLagosDay), as the server
// counts them.
// Shared by the app and its tests.
import { differenceInYears, isValid, parseISO } from "date-fns";

export const MINIMUM_AGE = 13;
const ADULT_AGE = 18;

const LAGOS = "Africa/Lagos";

// The date of birth as typed in the DD, MM and YYYY boxes.
export type DateOfBirthBoxes = { d: string; m: string; y: string };

export type AgreementForm = {
  dob: DateOfBirthBoxes;
  terms: boolean;
  parent: boolean;
};

export function readDateOfBirth({ d, m, y }: DateOfBirthBoxes, today: string) {
  if (!d || !m || y.length < 4) return { state: "empty" } as const;
  const iso = `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
  const date = parseISO(iso);
  if (Number(y) < 1900 || !isValid(date) || iso > today) return { state: "bad" } as const;
  return { state: "ok", iso, age: differenceInYears(parseISO(today), date) } as const;
}

// 13 to 17: the parent-or-guardian tick shows.
export function isTeen(dob: DateOfBirthBoxes, today: string) {
  const read = readDateOfBirth(dob, today);
  return read.state === "ok" && read.age >= MINIMUM_AGE && read.age < ADULT_AGE;
}

// What stops the person continuing, in v6.9's order and words, or null.
export function agreementError(form: AgreementForm, today: string) {
  const read = readDateOfBirth(form.dob, today);
  if (read.state === "empty") return "Enter your date of birth.";
  if (read.state === "bad") return "Enter a real date of birth.";
  if (read.age < MINIMUM_AGE) return "You need to be 13 or older to use Sustena.";
  if (read.age < ADULT_AGE && !form.parent) return "Tick the box to confirm your parent or guardian agrees.";
  if (!form.terms) return "Tick the box to agree to the Terms of Service and the Privacy Policy.";
  return null;
}

// Settings' Legal rows: "Agreed on 15 October 2026".
export function agreedOnText(termsAcceptedAt: string | null | undefined) {
  if (!termsAcceptedAt) return "Not agreed yet";
  const date = new Intl.DateTimeFormat("en-GB", { timeZone: LAGOS, day: "numeric", month: "long", year: "numeric" }).format(new Date(termsAcceptedAt));
  return `Agreed on ${date}`;
}
