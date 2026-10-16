import { router, type Href } from "expo-router";

// A shared recipe or creator link opened before signing in: once the person
// is in (sign-up or sign-in, with the email code and the agreement), they
// land on Home with what was shared open on top. Kept in memory, so
// reloading the web app on the way in lands on Home.
let pendingLink: Href | null = null;

export function returnHereAfterSignIn(link: Href) {
  pendingLink = link;
}

export function enterApp() {
  const link = pendingLink;
  pendingLink = null;
  router.replace("/(tabs)/home");
  if (link) router.push(link);
}
