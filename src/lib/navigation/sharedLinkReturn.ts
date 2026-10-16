import { router, type Href } from "expo-router";

// A shared recipe or creator link opened before signing in: once the person
// is in (sign-up or sign-in, with the email code and the agreement), they
// land on what was shared instead of Home. Kept in memory, so reloading the
// web app on the way in lands on Home.
let pendingLink: Href | null = null;

export function returnHereAfterSignIn(link: Href) {
  pendingLink = link;
}

export function enterApp() {
  const target = pendingLink ?? "/(tabs)/home";
  pendingLink = null;
  router.replace(target);
}
