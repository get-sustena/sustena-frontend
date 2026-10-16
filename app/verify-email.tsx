import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { AuthHeader } from "../src/components/auth/AuthHeader";
import { AuthPrimaryButton } from "../src/components/auth/AuthPrimaryButton";
import { ChangeEmailSheet } from "../src/components/auth/ChangeEmailSheet";
import { CodeBoxes, emptyCode } from "../src/components/auth/CodeBoxes";
import { AppText } from "../src/components/ui/AppText";
import { Icon } from "../src/components/ui/Icon";
import {
  useLogoutMutation,
  useSendEmailCodeMutation,
  useVerifyEmailCodeMutation,
} from "../src/hooks/api/useAuth";
import { authApi } from "../src/lib/api";
import { getApiErrorMessage, isApiClientError } from "../src/lib/api/errors";
import { useAuthStore } from "../src/store/authStore";
import { openSheet, showToast } from "../src/store/uiStore";
import { theme } from "../src/theme/theme";
import { enterApp } from "../src/lib/navigation/sharedLinkReturn";

// Sign-up sends the first code; the server allows a new one a minute later.
const RESEND_SECONDS = 60;

// v6.9's "Check your email." (#auth-verify): a new account enters the code
// from its email before the app opens. The guard in app/_layout.tsx keeps the
// account here while /auth/me says emailVerificationRequired.
export default function VerifyEmailScreen() {
  // Arriving straight from sign-up, a code has just gone out.
  const { sent } = useLocalSearchParams<{ sent?: string }>();
  const email = useAuthStore((state) => state.user?.email ?? "");
  const setUser = useAuthStore((state) => state.setUser);
  const [code, setCode] = useState<string[]>(emptyCode);
  const [error, setError] = useState<string | null>(null);
  const resendWait = useCountdown(sent ? RESEND_SECONDS : 0);
  const secondsLeft = resendWait.secondsLeft;
  const sendCode = useSendEmailCodeMutation();
  const verifyCode = useVerifyEmailCodeMutation();
  const logout = useLogoutMutation();

  async function confirm() {
    if (code.some((digit) => digit === "")) {
      setError("Enter the 6-digit code from the email.");
      return;
    }
    setError(null);
    try {
      await verifyCode.mutateAsync(code.join(""));
      showToast("Your email is confirmed", "success");
      enterApp();
    } catch (verifyError) {
      // The API's own words: a wrong code, an expired one, or too many tries.
      setError(getApiErrorMessage(verifyError));
    }
  }

  async function resend() {
    if (secondsLeft > 0 || sendCode.isPending) return;
    setError(null);
    try {
      const result = await sendCode.mutateAsync();
      if (result.alreadyVerified) {
        // Confirmed elsewhere (another device): the guard opens the app.
        setUser(await authApi.getMe());
        enterApp();
        return;
      }
      setCode(emptyCode());
      resendWait.start(result.retryAfterSeconds || RESEND_SECONDS);
      showToast(`New code sent to ${email}`, "success");
    } catch (sendError) {
      if (isApiClientError(sendError) && sendError.status === 429) {
        resendWait.start(sendError.retryAfterSeconds ?? RESEND_SECONDS);
      }
      setError(getApiErrorMessage(sendError));
    }
  }

  // The server emailed a new code to the new address.
  function emailChanged(newEmail: string) {
    setCode(emptyCode());
    setError(null);
    resendWait.start(RESEND_SECONDS);
    showToast(`New code sent to ${newEmail}`, "success");
  }

  // Back signs out: the account can't open anything else until it's confirmed.
  async function leave() {
    try {
      await logout.mutateAsync();
    } finally {
      router.replace("/auth");
    }
  }

  const canResend = secondsLeft <= 0 && !sendCode.isPending;

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <AuthHeader onBack={() => void leave()} />

      <ScrollView
        style={styles.body}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        automaticallyAdjustKeyboardInsets
        contentContainerStyle={styles.bodyContent}
      >
        <View style={styles.iconTile}>
          <Icon name="mail" size={24} color={theme.colors.navy3} />
        </View>
        <AppText style={styles.title}>Check your email.</AppText>
        <AppText style={styles.subtitle}>
          Enter the 6-digit code we sent to{" "}
          <AppText style={styles.subtitleEmphasis}>{email}</AppText>. The code
          works for 15 minutes.
        </AppText>

        <CodeBoxes
          code={code}
          onChange={(next) => {
            setCode(next);
            setError(null);
          }}
          invalid={Boolean(error)}
          autoFocus
        />

        {error ? (
          <AppText accessibilityRole="alert" style={styles.codeError}>
            {error}
          </AppText>
        ) : null}

        <View style={styles.stepAction}>
          <AuthPrimaryButton
            title={verifyCode.isPending ? "Confirming..." : "Confirm email"}
            onPress={() => void confirm()}
            disabled={verifyCode.isPending}
          />
        </View>

        <Pressable
          onPress={() => void resend()}
          disabled={!canResend}
          style={styles.resendRow}
          accessibilityRole="button"
        >
          <AppText style={styles.mutedText}>Didn&apos;t get it? </AppText>
          <AppText style={canResend ? styles.resendLink : styles.resendWait}>
            {sendCode.isPending
              ? "Sending..."
              : canResend
              ? "Resend code"
              : `Resend in ${formatWait(secondsLeft)}`}
          </AppText>
        </Pressable>

        <AppText style={styles.spamHint}>
          Can&apos;t find the email? Check your spam folder.
        </AppText>

        <Pressable
          onPress={() => openSheet(<ChangeEmailSheet onChanged={emailChanged} />)}
          style={styles.changeEmail}
          accessibilityRole="button"
        >
          <AppText style={styles.changeEmailText}>Use a different email</AppText>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// Counted against the clock, so a phone that sleeps or a hidden tab still
// shows the right wait when it comes back.
function useCountdown(initialSeconds: number) {
  const [clock, setClock] = useState(() => {
    const now = Date.now();
    return { endsAt: now + initialSeconds * 1000, now };
  });

  useEffect(() => {
    if (clock.endsAt <= clock.now) return;
    const timer = setInterval(() => {
      setClock((current) => ({ ...current, now: Date.now() }));
    }, 1000);
    return () => clearInterval(timer);
  }, [clock.endsAt, clock.now]);

  return {
    secondsLeft: Math.max(0, Math.ceil((clock.endsAt - clock.now) / 1000)),
    start(seconds: number) {
      const now = Date.now();
      setClock({ endsAt: now + seconds * 1000, now });
    },
  };
}

function formatWait(seconds: number) {
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#FAFAFA",
  },
  body: {
    flex: 1,
  },
  bodyContent: {
    paddingHorizontal: 24,
    paddingTop: 26,
    paddingBottom: 40,
  },
  iconTile: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: theme.colors.card2,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 18,
  },
  title: {
    fontFamily: theme.fontFamily.displayExtraBold,
    fontSize: 32,
    lineHeight: 35,
    letterSpacing: -0.64,
    color: theme.colors.navy,
    marginBottom: 8,
  },
  subtitle: {
    fontFamily: theme.fontFamily.body,
    fontSize: 15,
    lineHeight: 22,
    color: theme.colors.textMedium,
    marginBottom: 28,
  },
  subtitleEmphasis: {
    fontFamily: theme.fontFamily.bodyBold,
    fontSize: 15,
    color: theme.colors.navy,
  },
  codeError: {
    marginTop: 6,
    color: theme.colors.red,
    fontFamily: theme.fontFamily.body,
    fontSize: 12.5,
    textAlign: "center",
  },
  stepAction: {
    marginTop: 22,
  },
  resendRow: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 22,
  },
  mutedText: {
    fontFamily: theme.fontFamily.body,
    fontSize: 13.5,
    color: theme.colors.textMedium,
  },
  resendLink: {
    fontFamily: theme.fontFamily.bodyBold,
    fontSize: 13.5,
    color: theme.colors.navy3,
  },
  resendWait: {
    fontFamily: theme.fontFamily.bodyBold,
    fontSize: 13.5,
    color: theme.colors.textMedium,
  },
  changeEmail: {
    alignSelf: "center",
    minHeight: 44,
    marginTop: 8,
    paddingHorizontal: 8,
    justifyContent: "center",
  },
  changeEmailText: {
    fontFamily: theme.fontFamily.bodySemiBold,
    fontSize: 13.5,
    color: theme.colors.navy,
    textDecorationLine: "underline",
  },
  spamHint: {
    marginTop: 10,
    fontFamily: theme.fontFamily.body,
    fontSize: 13,
    lineHeight: 19.5,
    color: theme.colors.textMedium,
    textAlign: "center",
  },
});
