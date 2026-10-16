import { router, type Href } from "expo-router";
import { useEffect } from "react";
import { returnHereAfterSignIn } from "../lib/navigation/sharedLinkReturn";
import { useAuthStore } from "../store/authStore";

// app/r and app/c. Signed in, `open` goes straight to what was shared.
// Otherwise the person signs up or signs in first (app/index.tsx picks the
// step), and lands here again after.
export function useSharedLink(link: Href, open: () => void) {
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
    returnHereAfterSignIn(link);
    router.replace("/");
  }, [link, open, signedIn]);
}
