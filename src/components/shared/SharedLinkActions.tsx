import { router, type Href } from "expo-router";
import { Pressable, StyleSheet } from "react-native";
import { returnHereAfterSignIn } from "../../lib/navigation/sharedLinkReturn";
import { socialCopy } from "../../lib/socialCopy";
import { theme } from "../../theme/theme";
import { AppText } from "../ui/AppText";

type Props = {
  // The shared link, opened again once the person is in.
  link: Href;
  signUpLabel: string;
};

// Sign up and Sign in on a shared link opened signed out (PRD v6.9 section
// 20, C4 and C5). Either way the person lands Home with what was shared open
// on top.
export function SharedLinkActions({ link, signUpLabel }: Props) {
  function go(screen: "/auth-signup" | "/auth") {
    returnHereAfterSignIn(link);
    router.push(screen);
  }

  return (
    <>
      <Pressable
        onPress={() => go("/auth-signup")}
        accessibilityRole="button"
        style={({ pressed }) => [styles.primary, pressed && styles.pressed]}
      >
        <AppText style={styles.primaryLabel}>{signUpLabel}</AppText>
      </Pressable>
      <Pressable
        onPress={() => go("/auth")}
        accessibilityRole="button"
        style={({ pressed }) => [styles.secondary, pressed && styles.pressed]}
      >
        <AppText style={styles.secondaryLabel}>{socialCopy.signIn}</AppText>
      </Pressable>
    </>
  );
}

const styles = StyleSheet.create({
  primary: {
    width: "100%",
    minHeight: 52,
    borderRadius: 999,
    backgroundColor: theme.colors.orange,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryLabel: {
    fontFamily: theme.fontFamily.bodySemiBold,
    fontSize: 15,
    lineHeight: 15,
    color: theme.colors.navy,
  },
  secondary: {
    width: "100%",
    minHeight: 48,
    marginTop: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryLabel: {
    fontFamily: theme.fontFamily.bodySemiBold,
    fontSize: 14.5,
    lineHeight: 14.5,
    color: theme.colors.navy,
  },
  pressed: { transform: [{ scale: 0.96 }] },
});
