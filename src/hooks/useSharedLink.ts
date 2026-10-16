import { router, type Href } from "expo-router";
import { useEffect } from "react";
import { returnHereAfterSignIn } from "../lib/navigation/sharedLinkReturn";
import { useAuthStore } from "../store/authStore";

// app/r and app/c. Signed in, `open` goes straight to what was shared.
// Signed out, the screen shows what was shared with Sign up and Sign in
// (PRD v6.9 section 20). Signed in but still owing the email code or the
// agreement, app/index.tsx picks that step, and the person lands here after.
export function useSharedLink(link: Href, open: () => void) {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const signedIn = useAuthStore(
    (state) =>
      state.isAuthenticated &&
      !state.user?.emailVerificationRequired &&
      !state.user?.agreementRequired
  );

  useEffect(() => {
    if (signedIn) {
      open();
      return;
    }
    if (!isAuthenticated) return;
    returnHereAfterSignIn(link);
    router.replace("/");
  }, [isAuthenticated, link, open, signedIn]);

  return { signedOut: !isAuthenticated };
}
