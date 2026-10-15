// The one reminder at the top of Home (v6.9): "Confirm your email" first,
// then "Complete your profile". Shared by the app and its tests, so nothing
// here imports React Native. Days are Lagos days as YYYY-MM-DD.
import { addDays, format, parseISO } from "date-fns";

// The backend's confirmation links last 7 days.
const EMAIL_LINK_DAYS = 7;
// A dismissed profile card comes back after 7 days (founder, 15 October 2026).
const PROFILE_REMINDER_REST_DAYS = 7;

const FULL_DATE = new Intl.DateTimeFormat("en-GB", {
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
});

function plusDays(day: string, days: number) {
  return format(addDays(parseISO(day), days), "yyyy-MM-dd");
}

// "Thursday 22 October 2026", as v6.9 writes it (en-GB puts a comma after
// the weekday).
export function fullDate(day: string) {
  return FULL_DATE.formatToParts(parseISO(day))
    .map((part) => (part.type === "literal" ? " " : part.value))
    .join("")
    .replace(/\s+/g, " ");
}

export function linkWorksUntil(sentOn: string) {
  return fullDate(plusDays(sentOn, EMAIL_LINK_DAYS));
}

// After that the link has expired, and the card asks to resend again.
export function linkStillWorks(sentOn: string, today: string) {
  return today <= plusDays(sentOn, EMAIL_LINK_DAYS);
}

export function profileReminderResting(dismissedOn: string | null, today: string) {
  return dismissedOn !== null && today < plusDays(dismissedOn, PROFILE_REMINDER_REST_DAYS);
}

type HomeReminderState = {
  // null while the account isn't known yet (an offline start).
  emailConfirmed: boolean | null;
  answered: number;
  total: number;
  dismissedOn: string | null;
  today: string;
};

export function homeReminder({ emailConfirmed, answered, total, dismissedOn, today }: HomeReminderState) {
  if (emailConfirmed === null) return null;
  if (!emailConfirmed) return "email";
  if (answered >= total || profileReminderResting(dismissedOn, today)) return null;
  return "profile";
}
