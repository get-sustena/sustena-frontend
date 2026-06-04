import { router, useLocalSearchParams } from "expo-router";
import { useMemo, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import { AppText } from "../src/components/ui/AppText";
import { Button } from "../src/components/ui/Button";
import { theme } from "../src/theme/theme";

type AuthMode = "signin" | "signup";

export default function AuthScreen() {
  const params = useLocalSearchParams<{ mode?: AuthMode }>();

  const initialMode = useMemo<AuthMode>(() => {
    return params.mode === "signup" ? "signup" : "signin";
  }, [params.mode]);

  const [mode, setMode] = useState<AuthMode>(initialMode);

  function continueToOnboarding() {
    router.replace("/onboarding/product");
  }

  return (
    <View style={styles.screen}>
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
            onSubmit={continueToOnboarding}
            onSwitch={() => setMode("signup")}
          />
        ) : (
          <SignUpForm
            onSubmit={continueToOnboarding}
            onSwitch={() => setMode("signin")}
          />
        )}
      </ScrollView>
    </View>
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
  onSubmit,
  onSwitch,
}: {
  onSubmit: () => void;
  onSwitch: () => void;
}) {
  return (
    <View>
      <Field label="Email Address" placeholder="you@example.com" />
      <Field label="Password" placeholder="••••••••" secureTextEntry />

      <Pressable style={styles.forgotButton}>
        <AppText style={styles.forgotText}>Forgot password?</AppText>
      </Pressable>

      <Button title="Sign In" variant="primary" onPress={onSubmit} />

      <Divider label="or continue with" />

      <SocialButton label="Continue with Google" onPress={onSubmit} />

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
  onSubmit,
  onSwitch,
}: {
  onSubmit: () => void;
  onSwitch: () => void;
}) {
  return (
    <View>
      <Field label="Full Name" placeholder="Your full name" />
      <Field label="Email Address" placeholder="you@example.com" />
      <Field label="Password" placeholder="Min. 8 characters" secureTextEntry />

      <Button
        title="Create Account 🎉"
        variant="accent"
        onPress={onSubmit}
        style={styles.signupButton}
      />

      <Divider label="or sign up with" />

      <SocialButton label="Continue with Google" onPress={onSubmit} />

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
  secureTextEntry,
}: {
  label: string;
  placeholder: string;
  secureTextEntry?: boolean;
}) {
  return (
    <View style={styles.field}>
      <AppText style={styles.fieldLabel}>{label}</AppText>
      <TextInput
        placeholder={placeholder}
        placeholderTextColor={theme.colors.textDim}
        secureTextEntry={secureTextEntry}
        style={styles.input}
        autoCapitalize="none"
      />
    </View>
  );
}

function Divider({ label }: { label: string }) {
  return (
    <View style={styles.divider}>
      <View style={styles.dividerLine} />
      <AppText style={styles.dividerText}>{label}</AppText>
      <View style={styles.dividerLine} />
    </View>
  );
}

function SocialButton({
  label,
  onPress,
}: {
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={styles.socialButton}>
      <AppText style={styles.googleIcon}>G</AppText>
      <AppText style={styles.socialText}>{label}</AppText>
    </Pressable>
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
    backgroundColor: theme.colors.navy,
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
    width: "100%",
    minHeight: 48,
    paddingHorizontal: theme.spacing.lg,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: theme.colors.border2,
    backgroundColor: theme.colors.surface,
    fontFamily: theme.fontFamily.body,
    fontSize: 14,
    color: theme.colors.text,
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
