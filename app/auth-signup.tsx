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
import { AuthAlternativeActions } from "../src/components/auth/AuthAlternativeActions";
import { AuthField } from "../src/components/auth/AuthField";
import { AuthHeader } from "../src/components/auth/AuthHeader";
import { AuthPrimaryButton } from "../src/components/auth/AuthPrimaryButton";
import { PasswordMatchIndicator } from "../src/components/auth/PasswordMatchIndicator";
import { PasswordStrengthMeter } from "../src/components/auth/PasswordStrengthMeter";
import { AppText } from "../src/components/ui/AppText";
import { InlineNotice } from "../src/components/ui/InlineNotice";
import { useSignupMutation } from "../src/hooks/api/useAuth";
import {
  getApiErrorMessage,
  getApiValidationFieldErrors,
} from "../src/lib/api/errors";
import { getPasswordScore } from "../src/lib/passwordStrength";
import { showToast } from "../src/store/uiStore";
import { theme } from "../src/theme/theme";

type AuthFieldErrors = Record<string, string | undefined>;

export default function AuthSignupScreen() {
  const signupMutation = useSignupMutation();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<AuthFieldErrors>({});

  function continueAfterAuth() {
    router.replace("/(tabs)/home");
  }

  async function handleSubmit() {
    const trimmedFirstName = firstName.trim();
    const trimmedLastName = lastName.trim();
    const trimmedEmail = email.trim();

    if (
      !trimmedFirstName ||
      !trimmedLastName ||
      !trimmedEmail ||
      !trimmedEmail.includes("@") ||
      !password
    ) {
      setFormError(
        "Enter your first name, last name, email, and password to create an account."
      );
      setFieldErrors({
        firstName: !trimmedFirstName ? "First name is required." : undefined,
        lastName: !trimmedLastName ? "Last name is required." : undefined,
        email:
          !trimmedEmail || !trimmedEmail.includes("@")
            ? "Enter a valid email address."
            : undefined,
        password: !password ? "Password is required." : undefined,
      });
      return;
    }

    if (getPasswordScore(password) < 2) {
      setFormError("Password is too weak, add length, numbers, or symbols.");
      setFieldErrors({
        password: "Password is too weak, add length, numbers, or symbols.",
      });
      return;
    }

    if (password !== confirmPassword) {
      setFormError("Passwords don't match.");
      setFieldErrors({ confirmPassword: "Passwords don't match." });
      return;
    }

    setFormError(null);
    setFieldErrors({});

    try {
      await signupMutation.mutateAsync({
        firstName: trimmedFirstName,
        lastName: trimmedLastName,
        email: trimmedEmail,
        password,
      });
      showToast(
        "You're in. We've sent a verification email so you can verify your account.",
        "success"
      );
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
        <AppText style={styles.title}>Let&apos;s get started.</AppText>
        <AppText style={styles.subtitle}>
          Create your account in seconds.
        </AppText>

        <View style={styles.nameRow}>
          <View style={styles.nameField}>
            <AuthField
              label="First Name"
              placeholder="First name"
              icon="profile"
              value={firstName}
              onChangeText={(value) => {
                setFirstName(value);
                setFieldErrors((current) => ({
                  ...current,
                  firstName: undefined,
                  first_name: undefined,
                }));
              }}
              autoCapitalize="words"
              error={fieldErrors.firstName ?? fieldErrors.first_name}
            />
          </View>
          <View style={styles.nameField}>
            <AuthField
              label="Last Name"
              placeholder="Last name"
              icon="profile"
              value={lastName}
              onChangeText={(value) => {
                setLastName(value);
                setFieldErrors((current) => ({
                  ...current,
                  lastName: undefined,
                  last_name: undefined,
                }));
              }}
              autoCapitalize="words"
              error={fieldErrors.lastName ?? fieldErrors.last_name}
            />
          </View>
        </View>
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
          placeholder="Min. 8 characters"
          icon="lock"
          value={password}
          onChangeText={(value) => {
            setPassword(value);
            setFieldErrors((current) => ({ ...current, password: undefined }));
          }}
          secureTextEntry
          error={fieldErrors.password}
        />
        <PasswordStrengthMeter password={password} />

        <AuthField
          label="Confirm Password"
          placeholder="Re-enter your password"
          icon="lock"
          value={confirmPassword}
          onChangeText={(value) => {
            setConfirmPassword(value);
            setFieldErrors((current) => ({
              ...current,
              confirmPassword: undefined,
            }));
          }}
          secureTextEntry
          error={fieldErrors.confirmPassword}
        />
        <PasswordMatchIndicator
          password={password}
          confirmPassword={confirmPassword}
        />

        {formError ? (
          <View style={styles.notice}>
            <InlineNotice
              tone="error"
              title="Could not create account"
              message={formError}
            />
          </View>
        ) : null}

        <AuthPrimaryButton
          title={
            signupMutation.isPending ? "Creating account..." : "Create Account"
          }
          onPress={handleSubmit}
          disabled={signupMutation.isPending}
        />

        <AuthAlternativeActions />

        <View style={styles.switchRow}>
          <AppText style={styles.switchText}>Already have an account? </AppText>
          <Pressable onPress={() => router.replace("/auth")}>
            <AppText style={styles.switchLink}>Sign in</AppText>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
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
  nameRow: {
    flexDirection: "row",
    gap: 12,
  },
  nameField: {
    flex: 1,
    minWidth: 0,
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
  notice: {
    marginTop: -6,
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
});
