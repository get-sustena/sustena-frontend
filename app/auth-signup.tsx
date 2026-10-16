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
import { AgreementFields } from "../src/components/legal/AgreementFields";
import { AppText } from "../src/components/ui/AppText";
import { useSignupMutation } from "../src/hooks/api/useAuth";
import {
  getApiErrorMessage,
  getApiValidationFieldErrors,
  isApiClientError,
} from "../src/lib/api/errors";
import { isEmailAddress } from "../src/lib/emailAddress";
import { getLagosDay } from "../src/lib/lagosDay";
import {
  agreementError,
  readDateOfBirth,
  type AgreementForm,
} from "../src/lib/legal/agreement";
import { getPasswordScore } from "../src/lib/passwordStrength";
import { showToast } from "../src/store/uiStore";
import { theme } from "../src/theme/theme";

type AuthFieldErrors = Record<string, string | undefined>;

// The server's refusals about the date of birth and the ticks, shown with
// them rather than at the top.
const AGREEMENT_ERROR_CODES = [
  "TERMS_NOT_ACCEPTED",
  "INVALID_DATE_OF_BIRTH",
  "UNDER_MINIMUM_AGE",
  "GUARDIAN_CONSENT_REQUIRED",
];

export default function AuthSignupScreen() {
  const signupMutation = useSignupMutation();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<AuthFieldErrors>({});
  const [agreement, setAgreement] = useState<AgreementForm>({
    dob: { d: "", m: "", y: "" },
    terms: false,
    parent: false,
  });
  // Starts ticked, and the person can untick it (founder, 15 October 2026).
  const [marketingEmails, setMarketingEmails] = useState(true);
  const [agreementProblem, setAgreementProblem] = useState<string | null>(null);

  function continueAfterAuth() {
    router.replace("/(tabs)/home");
  }

  async function handleSubmit() {
    const trimmedFirstName = firstName.trim();
    const trimmedLastName = lastName.trim();
    const trimmedEmail = email.trim();
    // Checked with the other fields, so every problem shows at once.
    const today = getLagosDay();
    const problem = agreementError(agreement, today);
    const dateOfBirth = readDateOfBirth(agreement.dob, today);
    setAgreementProblem(problem);

    if (
      !trimmedFirstName ||
      !trimmedLastName ||
      !isEmailAddress(trimmedEmail) ||
      !password
    ) {
      setFormError(
        "Enter your first name, last name, email, and password to create an account."
      );
      setFieldErrors({
        firstName: !trimmedFirstName ? "First name is required." : undefined,
        lastName: !trimmedLastName ? "Last name is required." : undefined,
        email:
          !isEmailAddress(trimmedEmail)
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

    if (problem || dateOfBirth.state !== "ok") {
      return;
    }

    setFormError(null);
    setFieldErrors({});

    try {
      const { user } = await signupMutation.mutateAsync({
        firstName: trimmedFirstName,
        lastName: trimmedLastName,
        email: trimmedEmail,
        password,
        dateOfBirth: dateOfBirth.iso,
        termsAccepted: agreement.terms,
        guardianConsent: agreement.parent,
        marketingEmailsOptIn: marketingEmails,
      });
      // New accounts enter the code from their email before the app opens.
      if (user.emailVerificationRequired) {
        router.replace({ pathname: "/verify-email", params: { sent: "1" } });
        return;
      }
      showToast(
        "You're in. We've sent a verification email so you can verify your account.",
        "success"
      );
      continueAfterAuth();
    } catch (error) {
      if (isApiClientError(error) && error.code && AGREEMENT_ERROR_CODES.includes(error.code)) {
        setAgreementProblem(error.message);
        return;
      }
      // A message about one field shows under it, not again at the top.
      const fieldErrors = getApiValidationFieldErrors(error);
      setFieldErrors(fieldErrors);
      setFormError(Object.keys(fieldErrors).length ? null : getApiErrorMessage(error));
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
          marginBottom={22}
          error={fieldErrors.confirmPassword}
        />
        <PasswordMatchIndicator
          password={password}
          confirmPassword={confirmPassword}
        />

        <View style={styles.agreement}>
          <AgreementFields
            form={agreement}
            onChange={(next) => {
              setAgreement(next);
              setAgreementProblem(null);
            }}
            error={agreementProblem}
            marketing={{ value: marketingEmails, onChange: setMarketingEmails }}
          />
        </View>

        {formError && !Object.values(fieldErrors).some(Boolean) ? (
          <AppText accessibilityRole="alert" style={styles.formError}>
            {formError}
          </AppText>
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
  // v6.9's #signup-consent.
  agreement: {
    marginBottom: 22,
  },
  formError: {
    marginTop: -6,
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
