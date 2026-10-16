import { router } from "expo-router";
import { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { AuthField } from "../src/components/auth/AuthField";
import { AuthHeader } from "../src/components/auth/AuthHeader";
import { AuthPrimaryButton } from "../src/components/auth/AuthPrimaryButton";
import { AppText } from "../src/components/ui/AppText";
import { useLoginMutation } from "../src/hooks/api/useAuth";
import { isEmailAddress } from "../src/lib/emailAddress";
import {
  getApiErrorMessage,
  getApiValidationFieldErrors,
} from "../src/lib/api/errors";
import { showToast } from "../src/store/uiStore";
import { theme } from "../src/theme/theme";
import { enterApp } from "../src/lib/navigation/sharedLinkReturn";

type AuthFieldErrors = Record<string, string | undefined>;

export default function AuthScreen() {
  const loginMutation = useLoginMutation();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<AuthFieldErrors>({});

  function continueAfterAuth() {
    enterApp();
  }

  async function handleSubmit() {
    const trimmedEmail = email.trim();

    if (!isEmailAddress(trimmedEmail) || !password) {
      setFormError("Enter your email and password to sign in.");
      setFieldErrors({
        email:
          !isEmailAddress(trimmedEmail)
            ? "Enter a valid email address."
            : undefined,
        password: !password ? "Password is required." : undefined,
      });
      return;
    }

    setFormError(null);
    setFieldErrors({});

    try {
      const { user } = await loginMutation.mutateAsync({ email: trimmedEmail, password });
      // An account that hasn't entered its email code yet goes there first.
      if (user.emailVerificationRequired) {
        router.replace("/verify-email");
        return;
      }
      showToast("You're in. We'll personalize as you go.", "success");
      continueAfterAuth();
    } catch (error) {
      setFormError(getApiErrorMessage(error));
      setFieldErrors(getApiValidationFieldErrors(error));
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <AuthHeader onBack={() => router.replace("/welcome")} />

      <ScrollView
        style={styles.body}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        automaticallyAdjustKeyboardInsets
        contentContainerStyle={styles.bodyContent}
      >
        <AppText style={styles.title}>Welcome back.</AppText>
        <AppText style={styles.subtitle}>
          Pick up right where you left off.
        </AppText>

        <AuthField
          label="Email Address"
          placeholder="you@example.com"
          icon="mail"
          value={email}
          onChangeText={(value) => {
            setEmail(value);
            setFieldErrors((current) => ({ ...current, email: undefined }));
          }}
          keyboardType="email-address"
          error={fieldErrors.email}
        />
        <AuthField
          label="Password"
          placeholder="••••••••"
          icon="lock"
          value={password}
          onChangeText={(value) => {
            setPassword(value);
            setFieldErrors((current) => ({ ...current, password: undefined }));
          }}
          secureTextEntry
          marginBottom={10}
          error={fieldErrors.password}
        />

        <Pressable
          onPress={() => router.push("/auth-forgot")}
          style={styles.forgotLink}
        >
          <AppText style={styles.forgotLinkText}>Forgot password?</AppText>
        </Pressable>

        {formError && !Object.values(fieldErrors).some(Boolean) ? (
          <AppText accessibilityRole="alert" style={styles.formError}>
            {formError}
          </AppText>
        ) : null}

        <AuthPrimaryButton
          title={loginMutation.isPending ? "Signing in..." : "Sign In"}
          onPress={handleSubmit}
          disabled={loginMutation.isPending}
        />

        <View style={styles.switchRow}>
          <AppText style={styles.switchText}>
            Don&apos;t have an account?{" "}
          </AppText>
          <Pressable onPress={() => router.replace("/auth-signup")}>
            <AppText style={styles.switchLink}>Create one</AppText>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
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
  forgotLink: {
    alignSelf: "flex-end",
    marginTop: -8,
    marginBottom: 24,
  },
  forgotLinkText: {
    fontFamily: theme.fontFamily.bodySemiBold,
    fontSize: 13,
    color: "#1F7048",
  },
  formError: {
    marginTop: -12,
    marginBottom: 16,
    color: theme.colors.red,
    fontFamily: theme.fontFamily.body,
    fontSize: 12.5,
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
});
