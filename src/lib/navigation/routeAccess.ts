// Every route in app/ belongs to exactly one of these lists, and
// tests/routeAccess.test.mjs fails when a route is in neither. A new screen
// therefore cannot become reachable without sign-in by accident.
//
// The guard only stops the app from showing these screens. The API still has
// to refuse signed-out requests on its own.

// What a signed-out visitor needs: the entry redirect, welcome, the intro
// onboarding screen, and sign-in, sign-up and password reset.
export const PUBLIC_ROUTES = [
  "index",
  "welcome",
  "onboarding/product",
  "auth",
  "auth-signup",
  "auth-forgot",
] as const;

export const SIGNED_IN_ROUTES = [
  "(tabs)",
  "recipes/[id]",
  "recipe-nutrition/[id]",
  "saved-recipes",
  "shopping/[id]",
  "meal-plans/index",
  "meal-plans/[id]",
  "creators/[handle]",
  "creator/edit-profile",
  "creator/profile-preview",
  "creator/recipes/[id]",
  "creator/saved",
  "creator/specialities",
  "creator/unit-picker",
  "creator/vocabulary-picker",
  "onboarding/health",
  "onboarding/preferences",
  "profile-complete",
  "settings",
  "password-security",
  "subscription",
  "support",
  "unsaved-changes",
] as const;
