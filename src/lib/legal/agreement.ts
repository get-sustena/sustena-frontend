// Who may use Sustena: 18 and over, or under 18 with a parent's or
// guardian's permission, confirmed with a tick (founder, 16 October 2026),
// and the agreement to the Terms of Service and Privacy Policy. Shared by
// the app and its tests.

const LAGOS = "Africa/Lagos";

export type AgreementForm = {
  adult: boolean;
  terms: boolean;
};

// What stops the person continuing, in the order the ticks show, or null.
export function agreementError(form: AgreementForm) {
  if (!form.adult) return "Tick the box to confirm you're at least 18, or have permission from a parent or guardian.";
  if (!form.terms) return "Tick the box to agree to the Terms of Service and the Privacy Policy.";
  return null;
}

// Settings' Legal rows: "Agreed on 15 October 2026".
export function agreedOnText(termsAcceptedAt: string | null | undefined) {
  if (!termsAcceptedAt) return "Not agreed yet";
  const date = new Intl.DateTimeFormat("en-GB", { timeZone: LAGOS, day: "numeric", month: "long", year: "numeric" }).format(new Date(termsAcceptedAt));
  return `Agreed on ${date}`;
}
