// app/auth-forgot.tsx
//
// Forgot-password (email -> 6-digit code -> new password -> success) flow,
// backed by the real /auth/forgot-password, /auth/verify-reset-code, and
// /auth/reset-password endpoints.

import { router } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import { AuthField } from "../src/components/auth/AuthField";
import { AuthHeader } from "../src/components/auth/AuthHeader";
import { AuthPrimaryButton } from "../src/components/auth/AuthPrimaryButton";
import { PasswordMatchIndicator } from "../src/components/auth/PasswordMatchIndicator";
import { PasswordStrengthMeter } from "../src/components/auth/PasswordStrengthMeter";
import { AppText } from "../src/components/ui/AppText";
import { Icon } from "../src/components/ui/Icon";
import { InlineNotice } from "../src/components/ui/InlineNotice";
import {
  useForgotPasswordMutation,
  useResetPasswordMutation,
  useVerifyResetCodeMutation,
} from "../src/hooks/api/useAuth";
import { getApiErrorMessage } from "../src/lib/api/errors";
import { getPasswordScore } from "../src/lib/passwordStrength";
import { theme } from "../src/theme/theme";

type ForgotStep = "email" | "code" | "password" | "done";

const OTP_LENGTH = 6;
const RESEND_SECONDS = 45;

export default function AuthForgotScreen() {
  const [step, setStep] = useState<ForgotStep>("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState<string[]>(Array(OTP_LENGTH).fill(""));
  const [resetToken, setResetToken] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [resendSecondsLeft, setResendSecondsLeft] = useState(0);

  const forgotPasswordMutation = useForgotPasswordMutation();
  const verifyResetCodeMutation = useVerifyResetCodeMutation();
  const resetPasswordMutation = useResetPasswordMutation();

  useEffect(() => {
    if (resendSecondsLeft <= 0) return;

    const timer = setTimeout(() => {
      setResendSecondsLeft((current) => current - 1);
    }, 1000);

    return () => clearTimeout(timer);
  }, [resendSecondsLeft]);

  function handleBack() {
    if (step === "code") {
      setStep("email");
      return;
    }

    if (step === "password") {
      setStep("code");
      return;
    }

    router.replace("/auth");
  }

  async function handleSendCode() {
    const trimmedEmail = email.trim();

    if (!trimmedEmail || !trimmedEmail.includes("@")) {
      setError("Enter a valid email address.");
      return;
    }

    setError(null);

    try {
      await forgotPasswordMutation.mutateAsync({ email: trimmedEmail });
      setOtp(Array(OTP_LENGTH).fill(""));
      setResendSecondsLeft(RESEND_SECONDS);
      setStep("code");
    } catch (submitError) {
      setError(getApiErrorMessage(submitError));
    }
  }

  async function handleResendCode() {
    if (resendSecondsLeft > 0) return;

    const trimmedEmail = email.trim();
    setError(null);

    try {
      await forgotPasswordMutation.mutateAsync({ email: trimmedEmail });
      setResendSecondsLeft(RESEND_SECONDS);
    } catch (resendError) {
      setError(getApiErrorMessage(resendError));
    }
  }

  async function handleVerifyCode() {
    if (otp.some((digit) => digit === "")) {
      setError("Enter the 6-digit code we sent you.");
      return;
    }

    setError(null);

    try {
      const response = await verifyResetCodeMutation.mutateAsync({
        email: email.trim(),
        code: otp.join(""),
      });
      setResetToken(response.resetToken);
      setStep("password");
    } catch (verifyError) {
      setError(getApiErrorMessage(verifyError));
    }
  }

  async function handleResetPassword() {
    if (getPasswordScore(newPassword) < 2 || newPassword.length < 8) {
      setError("Password is too weak, add length, numbers, or symbols.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Passwords must match.");
      return;
    }

    if (!resetToken) {
      setError("Your reset session expired. Please request a new code.");
      setStep("email");
      return;
    }

    setError(null);

    try {
      await resetPasswordMutation.mutateAsync({ resetToken, newPassword });
      setStep("done");
    } catch (resetError) {
      setError(getApiErrorMessage(resetError));
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <AuthHeader onBack={handleBack} />

      <ScrollView
        style={styles.body}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        automaticallyAdjustKeyboardInsets
        contentContainerStyle={styles.bodyContent}
      >
        {step === "email" ? (
          <EmailStep
            email={email}
            onChangeEmail={(value) => {
              setEmail(value);
              setError(null);
            }}
            error={error}
            isSubmitting={forgotPasswordMutation.isPending}
            onSubmit={handleSendCode}
          />
        ) : null}

        {step === "code" ? (
          <CodeStep
            email={email}
            otp={otp}
            onChangeOtp={setOtp}
            error={error}
            isSubmitting={verifyResetCodeMutation.isPending}
            isResending={forgotPasswordMutation.isPending}
            resendSecondsLeft={resendSecondsLeft}
            onSubmit={handleVerifyCode}
            onResend={handleResendCode}
          />
        ) : null}

        {step === "password" ? (
          <PasswordStep
            newPassword={newPassword}
            confirmPassword={confirmPassword}
            onChangeNewPassword={(value) => {
              setNewPassword(value);
              setError(null);
            }}
            onChangeConfirmPassword={(value) => {
              setConfirmPassword(value);
              setError(null);
            }}
            error={error}
            isSubmitting={resetPasswordMutation.isPending}
            onSubmit={handleResetPassword}
          />
        ) : null}

        {step === "done" ? <DoneStep /> : null}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function EmailStep({
  email,
  onChangeEmail,
  error,
  isSubmitting,
  onSubmit,
}: {
  email: string;
  onChangeEmail: (value: string) => void;
  error: string | null;
  isSubmitting: boolean;
  onSubmit: () => void;
}) {
  return (
    <View>
      <AppText style={styles.title}>Reset your password.</AppText>
      <AppText style={styles.subtitle}>
        Enter the email on your account and we&apos;ll send you a code to
        reset it.
      </AppText>

      <AuthField
        label="Email Address"
        placeholder="you@example.com"
        icon="mail"
        value={email}
        onChangeText={onChangeEmail}
        keyboardType="email-address"
        error={error ?? undefined}
      />

      <AuthPrimaryButton
        title={isSubmitting ? "Sending..." : "Send Reset Code"}
        onPress={onSubmit}
        disabled={isSubmitting}
      />

      <Pressable onPress={() => router.replace("/auth")} style={styles.switchRow}>
        <AppText style={styles.switchText}>Remembered it? </AppText>
        <AppText style={styles.switchLink}>Sign in</AppText>
      </Pressable>
    </View>
  );
}

function CodeStep({
  email,
  otp,
  onChangeOtp,
  error,
  isSubmitting,
  isResending,
  resendSecondsLeft,
  onSubmit,
  onResend,
}: {
  email: string;
  otp: string[];
  onChangeOtp: (otp: string[]) => void;
  error: string | null;
  isSubmitting: boolean;
  isResending: boolean;
  resendSecondsLeft: number;
  onSubmit: () => void;
  onResend: () => void;
}) {
  const inputRefs = useRef<(TextInput | null)[]>([]);
  const canResend = resendSecondsLeft <= 0 && !isResending;

  function handleDigitChange(index: number, value: string) {
    const digits = value.replace(/[^0-9]/g, "");

    if (digits.length > 1) {
      // Pasted a full code — distribute across boxes starting here.
      const next = [...otp];
      let cursor = index;

      for (const digit of digits) {
        if (cursor >= OTP_LENGTH) break;
        next[cursor] = digit;
        cursor += 1;
      }

      onChangeOtp(next);
      inputRefs.current[Math.min(cursor, OTP_LENGTH - 1)]?.focus();
      return;
    }

    const next = [...otp];
    next[index] = digits;
    onChangeOtp(next);

    if (digits && index < OTP_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  }

  function handleKeyPress(index: number, key: string) {
    if (key === "Backspace" && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  }

  return (
    <View>
      <AppText style={styles.title}>Enter your code.</AppText>
      <AppText style={styles.subtitle}>
        We sent a 6-digit code to{" "}
        <AppText style={styles.subtitleEmphasis}>
          {email || "your email"}
        </AppText>
        .
      </AppText>

      <View style={styles.otpRow}>
        {otp.map((digit, index) => (
          <TextInput
            key={index}
            ref={(ref) => {
              inputRefs.current[index] = ref;
            }}
            value={digit}
            onChangeText={(value) => handleDigitChange(index, value)}
            onKeyPress={({ nativeEvent }) =>
              handleKeyPress(index, nativeEvent.key)
            }
            keyboardType="number-pad"
            style={[styles.otpBox, error && styles.otpBoxError]}
          />
        ))}
      </View>

      {error ? (
        <View style={styles.notice}>
          <InlineNotice tone="error" message={error} />
        </View>
      ) : null}

      <AuthPrimaryButton
        title={isSubmitting ? "Verifying..." : "Verify Code"}
        onPress={onSubmit}
        disabled={isSubmitting}
      />

      <Pressable
        onPress={onResend}
        disabled={!canResend}
        style={styles.switchRow}
        accessibilityRole="button"
      >
        <AppText style={styles.switchText}>Didn&apos;t get it? </AppText>
        <AppText style={canResend ? styles.resendLink : styles.resendLinkInactive}>
          {isResending
            ? "Resending..."
            : canResend
              ? "Resend code"
              : `Resend in 0:${String(resendSecondsLeft).padStart(2, "0")}`}
        </AppText>
      </Pressable>
    </View>
  );
}

function PasswordStep({
  newPassword,
  confirmPassword,
  onChangeNewPassword,
  onChangeConfirmPassword,
  error,
  isSubmitting,
  onSubmit,
}: {
  newPassword: string;
  confirmPassword: string;
  onChangeNewPassword: (value: string) => void;
  onChangeConfirmPassword: (value: string) => void;
  error: string | null;
  isSubmitting: boolean;
  onSubmit: () => void;
}) {
  return (
    <View>
      <AppText style={styles.title}>Set a new password.</AppText>
      <AppText style={styles.subtitle}>
        Make it something you&apos;ll remember this time.
      </AppText>

      <AuthField
        label="New Password"
        placeholder="Min. 8 characters"
        icon="lock"
        value={newPassword}
        onChangeText={onChangeNewPassword}
        secureTextEntry
      />
      <PasswordStrengthMeter password={newPassword} />

      <AuthField
        label="Confirm Password"
        placeholder="Re-enter your password"
        icon="lock"
        value={confirmPassword}
        onChangeText={onChangeConfirmPassword}
        secureTextEntry
      />
      <PasswordMatchIndicator
        password={newPassword}
        confirmPassword={confirmPassword}
      />

      {error ? (
        <View style={styles.notice}>
          <InlineNotice tone="error" message={error} />
        </View>
      ) : null}

      <AuthPrimaryButton
        title={isSubmitting ? "Resetting..." : "Reset Password"}
        onPress={onSubmit}
        disabled={isSubmitting}
      />
    </View>
  );
}

function DoneStep() {
  return (
    <View style={styles.doneContainer}>
      <View style={styles.doneIconWrap}>
        <Icon name="check" size={28} color={theme.colors.navy3} strokeWidth={2.5} />
      </View>

      <AppText style={styles.doneTitle}>Password reset.</AppText>
      <AppText style={styles.doneSubtitle}>
        Your password has been updated. Use it to sign back in.
      </AppText>

      <AuthPrimaryButton
        title="Back to Sign In"
        dark
        onPress={() => router.replace("/auth")}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#FBFCFA",
  },
  body: {
    flex: 1,
  },
  bodyContent: {
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 40,
  },
  title: {
    fontFamily: theme.fontFamily.displayExtraBold,
    fontSize: 32,
    lineHeight: 35,
    letterSpacing: -0.5,
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
  otpRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 10,
    marginBottom: 14,
  },
  otpBox: {
    width: 46,
    height: 56,
    textAlign: "center",
    backgroundColor: theme.colors.card,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    borderRadius: 14,
    fontFamily: theme.fontFamily.bodyBold,
    fontSize: 22,
    color: theme.colors.text,
    shadowColor: theme.colors.navy,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
  },
  otpBoxError: {
    borderColor: theme.colors.red,
  },
  notice: {
    marginBottom: theme.spacing.md,
  },
  switchRow: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 22,
  },
  switchText: {
    fontFamily: theme.fontFamily.body,
    fontSize: 13.5,
    color: theme.colors.textMedium,
  },
  switchLink: {
    fontFamily: theme.fontFamily.bodyBold,
    fontSize: 13.5,
    color: theme.colors.navy,
  },
  resendLink: {
    fontFamily: theme.fontFamily.bodyBold,
    fontSize: 13.5,
    color: theme.colors.linkGreen,
  },
  resendLinkInactive: {
    fontFamily: theme.fontFamily.body,
    fontSize: 13.5,
    color: theme.colors.textMuted,
  },
  doneContainer: {
    paddingTop: 18,
  },
  doneIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: theme.colors.card2,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 22,
  },
  doneTitle: {
    fontFamily: theme.fontFamily.displayExtraBold,
    fontSize: 28,
    lineHeight: 32,
    letterSpacing: -0.4,
    color: theme.colors.navy,
    marginBottom: 10,
  },
  doneSubtitle: {
    fontFamily: theme.fontFamily.body,
    fontSize: 15,
    lineHeight: 23,
    color: theme.colors.textMedium,
    marginBottom: 28,
  },
});
