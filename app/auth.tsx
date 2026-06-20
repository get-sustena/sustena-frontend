import { router, useLocalSearchParams } from "expo-router";
import { useMemo, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import { AppText } from "../src/components/ui/AppText";
import { Button } from "../src/components/ui/Button";
import { useLoginMutation, useSignupMutation } from "../src/hooks/api/useAuth";
import {
  getApiErrorMessage,
  getApiValidationFieldErrors,
} from "../src/lib/api/errors";
import { usePreferencesStore } from "../src/store/preferencesStore";
import { theme } from "../src/theme/theme";

type AuthMode = "signin" | "signup";
type AuthFieldErrors = Record<string, string | undefined>;

export default function AuthScreen() {
  const params = useLocalSearchParams<{ mode?: AuthMode }>();

  const initialMode = useMemo<AuthMode>(() => {
    return params.mode === "signup" ? "signup" : "signin";
  }, [params.mode]);

  const [mode, setMode] = useState<AuthMode>(initialMode);
  const hasCompletedOnboarding = usePreferencesStore(
    (state) => state.hasCompletedOnboarding
  );

  function continueAfterAuth() {
    router.replace(
      hasCompletedOnboarding ? "/(tabs)/home" : "/onboarding/product"
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={styles.top}>
        <Decorations />

        <View style={styles.logoRow}>
          <View style={styles.logoIcon}>
            <AppText style={styles.logoEmoji}>🍲</AppText>
          </View>

          <AppText style={styles.logoText}>
            Cook<AppText style={styles.logoEmphasis}>Ease</AppText>
          </AppText>
        </View>
      </View>

      <ScrollView
        style={styles.body}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        contentContainerStyle={styles.bodyContent}
      >
        <View style={styles.tabs}>
          <AuthTab
            label="Sign In"
            active={mode === "signin"}
            onPress={() => setMode("signin")}
          />
          <AuthTab
            label="Create Account"
            active={mode === "signup"}
            onPress={() => setMode("signup")}
          />
        </View>

        {mode === "signin" ? (
          <SignInForm
            onSuccess={continueAfterAuth}
            onSwitch={() => setMode("signup")}
          />
        ) : (
          <SignUpForm
            onSuccess={continueAfterAuth}
            onSwitch={() => setMode("signin")}
          />
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function AuthTab({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.authTab, active && styles.authTabActive]}
    >
      <AppText style={[styles.authTabText, active && styles.authTabTextActive]}>
        {label}
      </AppText>
    </Pressable>
  );
}

function SignInForm({
  onSuccess,
  onSwitch,
}: {
  onSuccess: () => void;
  onSwitch: () => void;
}) {
  const loginMutation = useLoginMutation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<AuthFieldErrors>({});

  async function handleSubmit() {
    const trimmedEmail = email.trim();

    if (!trimmedEmail || !password) {
      setFormError("Enter your email and password to sign in.");
      setFieldErrors({
        email: !trimmedEmail ? "Email is required." : undefined,
        password: !password ? "Password is required." : undefined,
      });
      return;
    }

    setFormError(null);
    setFieldErrors({});

    try {
      await loginMutation.mutateAsync({
        email: trimmedEmail,
        password,
      });
      onSuccess();
    } catch (error) {
      setFormError(getApiErrorMessage(error));
      setFieldErrors(getApiValidationFieldErrors(error));
    }
  }

  return (
    <View>
      <Field
        label="Email Address"
        placeholder="you@example.com"
        value={email}
        onChangeText={(value) => {
          setEmail(value);
          setFieldErrors((current) => ({ ...current, email: undefined }));
        }}
        keyboardType="email-address"
        error={fieldErrors.email}
      />
      <Field
        label="Password"
        placeholder="••••••••"
        value={password}
        onChangeText={(value) => {
          setPassword(value);
          setFieldErrors((current) => ({ ...current, password: undefined }));
        }}
        secureTextEntry
        error={fieldErrors.password}
      />

      <Pressable style={styles.forgotButton}>
        <AppText style={styles.forgotText}>Forgot password?</AppText>
      </Pressable>

      {formError ? (
        <AppText style={styles.errorText}>{formError}</AppText>
      ) : null}

      <Button
        title={loginMutation.isPending ? "Signing in..." : "Sign In"}
        variant="primary"
        onPress={handleSubmit}
        disabled={loginMutation.isPending}
      />

      <View style={styles.switchRow}>
        <AppText style={styles.switchText}>
          Don&apos;t have an account?{" "}
        </AppText>
        <Pressable onPress={onSwitch}>
          <AppText style={styles.switchLink}>Create one</AppText>
        </Pressable>
      </View>
    </View>
  );
}

function SignUpForm({
  onSuccess,
  onSwitch,
}: {
  onSuccess: () => void;
  onSwitch: () => void;
}) {
  const signupMutation = useSignupMutation();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<AuthFieldErrors>({});

  async function handleSubmit() {
    const trimmedFirstName = firstName.trim();
    const trimmedLastName = lastName.trim();
    const trimmedEmail = email.trim();

    if (!trimmedFirstName || !trimmedLastName || !trimmedEmail || !password) {
      setFormError(
        "Enter your first name, last name, email, and password to create an account."
      );
      setFieldErrors({
        firstName: !trimmedFirstName ? "First name is required." : undefined,
        lastName: !trimmedLastName ? "Last name is required." : undefined,
        email: !trimmedEmail ? "Email is required." : undefined,
        password: !password ? "Password is required." : undefined,
      });
      return;
    }

    if (password.length < 8) {
      setFormError("Password must be at least 8 characters.");
      setFieldErrors({
        password: "Password must be at least 8 characters.",
      });
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
      onSuccess();
    } catch (error) {
      setFormError(getApiErrorMessage(error));
      setFieldErrors(getApiValidationFieldErrors(error));
    }
  }

  return (
    <View>
      <Field
        label="First Name"
        placeholder="Your first name"
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
      <Field
        label="Last Name"
        placeholder="Your last name"
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
      <Field
        label="Email Address"
        placeholder="you@example.com"
        value={email}
        onChangeText={(value) => {
          setEmail(value);
          setFieldErrors((current) => ({ ...current, email: undefined }));
        }}
        keyboardType="email-address"
        error={fieldErrors.email}
      />
      <Field
        label="Password"
        placeholder="Min. 8 characters"
        value={password}
        onChangeText={(value) => {
          setPassword(value);
          setFieldErrors((current) => ({ ...current, password: undefined }));
        }}
        secureTextEntry
        error={fieldErrors.password}
      />

      {formError ? (
        <AppText style={styles.errorText}>{formError}</AppText>
      ) : null}

      <Button
        title={
          signupMutation.isPending ? "Creating account..." : "Create Account"
        }
        variant="accent"
        onPress={handleSubmit}
        disabled={signupMutation.isPending}
        style={styles.signupButton}
      />

      <View style={styles.switchRow}>
        <AppText style={styles.switchText}>Already have an account? </AppText>
        <Pressable onPress={onSwitch}>
          <AppText style={styles.switchLink}>Sign in</AppText>
        </Pressable>
      </View>
    </View>
  );
}

function Field({
  label,
  placeholder,
  value,
  onChangeText,
  secureTextEntry,
  keyboardType,
  autoCapitalize = "none",
  error,
}: {
  label: string;
  placeholder: string;
  value: string;
  onChangeText: (value: string) => void;
  secureTextEntry?: boolean;
  keyboardType?: "default" | "email-address" | "number-pad";
  autoCapitalize?: "none" | "sentences" | "words" | "characters";
  error?: string;
}) {
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const isPasswordField = Boolean(secureTextEntry);

  return (
    <View style={styles.field}>
      <AppText style={styles.fieldLabel}>{label}</AppText>
      <View style={[styles.inputWrap, error && styles.inputWrapError]}>
        <TextInput
          placeholder={placeholder}
          placeholderTextColor={theme.colors.textDim}
          value={value}
          onChangeText={onChangeText}
          secureTextEntry={isPasswordField && !isPasswordVisible}
          keyboardType={keyboardType}
          style={[styles.input, isPasswordField && styles.passwordInput]}
          autoCapitalize={autoCapitalize}
          autoCorrect={false}
        />

        {isPasswordField ? (
          <Pressable
            onPress={() => setIsPasswordVisible((current) => !current)}
            hitSlop={8}
            style={styles.passwordToggle}
            accessibilityRole="button"
            accessibilityLabel={
              isPasswordVisible ? "Hide password" : "Show password"
            }
          >
            <AppText style={styles.passwordToggleText}>
              {isPasswordVisible ? "Hide" : "Show"}
            </AppText>
          </Pressable>
        ) : null}
      </View>

      {error ? <AppText style={styles.fieldErrorText}>{error}</AppText> : null}
    </View>
  );
}

function Decorations() {
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <AppText style={[styles.deco, styles.decoFood]}>🍛</AppText>
      <AppText style={[styles.deco, styles.decoHerb]}>🌿</AppText>
      <AppText style={[styles.deco, styles.decoTomato]}>🍅</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: theme.colors.cream,
  },
  top: {
    height: 200,
    justifyContent: "flex-end",
    padding: theme.spacing["2xl"],
    backgroundColor: theme.colors.navy,
    overflow: "hidden",
  },
  logoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.md,
    zIndex: 1,
  },
  logoIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: theme.colors.orange,
    alignItems: "center",
    justifyContent: "center",
  },
  logoEmoji: {
    fontSize: 22,
  },
  logoText: {
    fontFamily: theme.fontFamily.display,
    fontSize: 26,
    color: theme.colors.onDark,
  },
  logoEmphasis: {
    fontFamily: theme.fontFamily.display,
    fontSize: 26,
    color: theme.colors.orange2,
    fontStyle: "italic",
  },
  body: {
    flex: 1,
    backgroundColor: theme.colors.cream,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    marginTop: -20,
  },
  bodyContent: {
    paddingHorizontal: theme.spacing["2xl"],
    paddingTop: theme.spacing["3xl"],
    paddingBottom: theme.spacing["2xl"],
  },
  tabs: {
    flexDirection: "row",
    backgroundColor: theme.colors.navyDim,
    borderRadius: 12,
    padding: 4,
    marginBottom: theme.spacing["2xl"],
  },
  authTab: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 9,
    alignItems: "center",
  },
  authTabActive: {
    backgroundColor: theme.colors.navy,
  },
  authTabText: {
    fontFamily: theme.fontFamily.bodyBold,
    fontSize: 13,
    color: theme.colors.textMuted,
  },
  authTabTextActive: {
    color: theme.colors.onDark,
  },
  field: {
    marginBottom: theme.spacing.lg,
  },
  fieldLabel: {
    fontFamily: theme.fontFamily.bodyBold,
    fontSize: 11,
    color: theme.colors.textMedium,
    letterSpacing: 0.8,
    textTransform: "uppercase",
    marginBottom: 6,
  },
  input: {
    flex: 1,
    width: "100%",
    minHeight: 48,
    paddingHorizontal: theme.spacing.lg,
    fontFamily: theme.fontFamily.body,
    fontSize: 14,
    color: theme.colors.text,
  },
  inputWrap: {
    width: "100%",
    minHeight: 48,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: theme.colors.border2,
    backgroundColor: theme.colors.surface,
    flexDirection: "row",
    alignItems: "center",
  },
  inputWrapError: {
    borderColor: theme.colors.danger,
    backgroundColor: theme.colors.surface2,
  },
  passwordInput: {
    paddingRight: 72,
  },
  passwordToggle: {
    position: "absolute",
    right: 12,
    minHeight: 34,
    minWidth: 50,
    alignItems: "center",
    justifyContent: "center",
  },
  passwordToggleText: {
    fontFamily: theme.fontFamily.bodyBold,
    fontSize: 12,
    color: theme.colors.orange,
  },
  fieldErrorText: {
    fontFamily: theme.fontFamily.bodySemiBold,
    fontSize: 11,
    color: theme.colors.danger,
    marginTop: 6,
  },
  forgotButton: {
    alignSelf: "flex-end",
    marginTop: -8,
    marginBottom: theme.spacing.xl,
  },
  forgotText: {
    fontFamily: theme.fontFamily.bodySemiBold,
    fontSize: 12,
    color: theme.colors.orange,
  },
  signupButton: {
    marginBottom: theme.spacing.md,
  },
  errorText: {
    fontFamily: theme.fontFamily.bodySemiBold,
    fontSize: 12,
    color: theme.colors.danger,
    marginTop: -theme.spacing.sm,
    marginBottom: theme.spacing.md,
  },
  divider: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.md,
    marginVertical: theme.spacing.xl,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: theme.colors.border,
  },
  dividerText: {
    fontFamily: theme.fontFamily.bodySemiBold,
    fontSize: 11,
    color: theme.colors.textMuted,
  },
  socialButton: {
    width: "100%",
    minHeight: 48,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: theme.colors.border2,
    backgroundColor: theme.colors.surface,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: theme.spacing.md,
  },
  googleIcon: {
    fontFamily: theme.fontFamily.bodyBold,
    fontSize: 18,
    color: theme.colors.text,
  },
  socialText: {
    fontFamily: theme.fontFamily.bodySemiBold,
    fontSize: 14,
    color: theme.colors.text,
  },
  switchRow: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: theme.spacing.lg,
  },
  switchText: {
    fontFamily: theme.fontFamily.body,
    fontSize: 12,
    color: theme.colors.textMuted,
  },
  switchLink: {
    fontFamily: theme.fontFamily.bodyBold,
    fontSize: 12,
    color: theme.colors.orange,
  },
  deco: {
    position: "absolute",
  },
  decoFood: {
    top: 20,
    right: 20,
    fontSize: 48,
    opacity: 0.15,
    transform: [{ rotate: "15deg" }],
  },
  decoHerb: {
    top: 30,
    left: "20%",
    fontSize: 32,
    opacity: 0.12,
    transform: [{ rotate: "-10deg" }],
  },
  decoTomato: {
    bottom: 30,
    right: "35%",
    fontSize: 36,
    opacity: 0.12,
    transform: [{ rotate: "20deg" }],
  },
});
