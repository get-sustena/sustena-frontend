import { router } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { useRef, useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { markWelcomeSeen } from "../../db/appMetadataRepository";
import { useAgreeToTermsMutation, useLogoutMutation } from "../../hooks/api/useAuth";
import { getApiErrorMessage } from "../../lib/api/errors";
import { getLagosDay } from "../../lib/lagosDay";
import { agreementError, readDateOfBirth, type AgreementForm } from "../../lib/legal/agreement";
import { useAuthStore } from "../../store/authStore";
import { closeSheet, openSheet, showToast } from "../../store/uiStore";
import { theme } from "../../theme/theme";
import { AppText } from "../ui/AppText";
import { Icon } from "../ui/Icon";
import { SignOutSheet } from "../profile/SignOutSheet";
import { AgreementFields } from "./AgreementFields";

// When the Terms change, the date of birth is already saved: it isn't asked
// again, and the saved one is sent back (the server wants the same date).
function startingForm(dateOfBirth: string | null | undefined): AgreementForm {
  const [y = "", m = "", d = ""] = dateOfBirth?.split("-") ?? [];
  return { dob: { d, m, y }, terms: false, parent: false };
}

// v6.9's one-time agreement (renderLegalAgree) for accounts made before
// sign-up asked, or when the Terms change: shown before the app while
// /auth/me says agreementRequired.
export function AgreementScreen() {
  const db = useSQLiteContext();
  const insets = useSafeAreaInsets();
  const agree = useAgreeToTermsMutation();
  const logout = useLogoutMutation();
  const [savedDateOfBirth] = useState(() => useAuthStore.getState().user?.dateOfBirth ?? null);
  const [form, setForm] = useState(() => startingForm(savedDateOfBirth));
  const [error, setError] = useState<string | null>(null);
  const scroll = useRef<ScrollView>(null);

  async function submit() {
    const today = getLagosDay();
    const problem = agreementError(form, today);
    setError(problem);
    const read = readDateOfBirth(form.dob, today);
    if (problem || read.state !== "ok") {
      // The error sits under the ticks, below the fold on a short screen. A
      // repeat of the same error doesn't change the size, so it's scrolled here.
      scroll.current?.scrollToEnd();
      return;
    }
    try {
      await agree.mutateAsync({ dateOfBirth: read.iso, termsAccepted: form.terms, guardianConsent: form.parent });
      router.replace("/(tabs)/home");
      showToast("Saved. Read both any time in Settings.", "success");
    } catch (failure) {
      setError(getApiErrorMessage(failure));
      scroll.current?.scrollToEnd();
    }
  }

  async function signOut() {
    try {
      await logout.mutateAsync();
    } finally {
      await markWelcomeSeen(db).catch(() => undefined);
      closeSheet();
      router.replace("/auth");
    }
  }

  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView
        ref={scroll}
        // A new error line makes the page taller; it's brought into view then.
        onContentSizeChange={() => {
          if (error) scroll.current?.scrollToEnd();
        }}
        contentContainerStyle={[styles.body, { paddingTop: insets.top + 64 }]} keyboardShouldPersistTaps="handled">
        <View style={styles.mark}>
          <Icon name="fileText" size={28} color={theme.colors.navy3} />
        </View>
        <AppText accessibilityRole="header" style={styles.title}>Our Terms and Privacy Policy</AppText>
        <AppText style={styles.lead}>Sustena now has a Terms of Service and a Privacy Policy. Read them, then agree to keep using Sustena.</AppText>
        <View style={styles.rows}>
          <DocumentRow doc="terms" title="Terms of Service" subtitle="How Sustena works and your account" />
          <DocumentRow doc="privacy" title="Privacy Policy" subtitle="What Sustena keeps about you, why, and your choices" />
        </View>
        <View style={styles.fields}>
          <AgreementFields
            form={form}
            onChange={(next) => {
              setForm(next);
              setError(null);
            }}
            error={error}
            hideDateOfBirth={savedDateOfBirth !== null}
          />
        </View>
      </ScrollView>
      <View style={[styles.foot, { paddingBottom: insets.bottom + 18 }]}>
        <Pressable accessibilityRole="button" disabled={agree.isPending} onPress={() => void submit()} style={[styles.primary, agree.isPending && styles.disabled]}>
          <AppText style={styles.primaryText}>Agree and continue</AppText>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          onPress={() => openSheet(<SignOutSheet pending={logout.isPending} onCancel={closeSheet} onConfirm={() => void signOut()} />)}
          style={styles.signOut}
        >
          <AppText style={styles.signOutText}>Sign out</AppText>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

function DocumentRow({ doc, title, subtitle }: { doc: "terms" | "privacy"; title: string; subtitle: string }) {
  return (
    <Pressable accessibilityRole="button" onPress={() => router.push({ pathname: "/legal/[doc]", params: { doc } })} style={styles.row}>
      <Icon name={doc === "terms" ? "fileText" : "shieldCheck"} size={20} color={theme.colors.navy3} />
      <View style={styles.rowMain}>
        <AppText style={styles.rowTitle}>{title}</AppText>
        <AppText style={styles.rowSub}>{subtitle}</AppText>
      </View>
      <Icon name="chevronRight" size={16} color={theme.colors.navy} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.colors.surface },
  body: { paddingHorizontal: 20, paddingBottom: 40 },
  mark: { width: 64, height: 64, borderRadius: 32, backgroundColor: theme.colors.cream2, alignItems: "center", justifyContent: "center" },
  title: { marginTop: 20, fontFamily: theme.fontFamily.display, fontSize: 28, lineHeight: 31.4, letterSpacing: -0.7, color: theme.colors.navy },
  lead: { marginTop: 10, fontFamily: theme.fontFamily.body, fontSize: 15, lineHeight: 22.5, color: theme.colors.text },
  rows: { marginTop: 18, borderTopWidth: 0.75, borderTopColor: theme.colors.border },
  row: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 15, paddingHorizontal: 2, borderBottomWidth: 0.75, borderBottomColor: theme.colors.border },
  rowMain: { flex: 1, minWidth: 0 },
  rowTitle: { fontFamily: theme.fontFamily.bodySemiBold, fontSize: 14.5, lineHeight: 18.9, color: theme.colors.navy },
  rowSub: { marginTop: 3, fontFamily: theme.fontFamily.body, fontSize: 12.5, lineHeight: 16.9, color: theme.colors.textMedium },
  fields: { marginTop: 22 },
  foot: { paddingTop: 12, paddingHorizontal: 20, backgroundColor: theme.colors.surface },
  primary: { minHeight: 52, borderRadius: 999, backgroundColor: theme.colors.navy, alignItems: "center", justifyContent: "center" },
  disabled: { opacity: 0.45 },
  primaryText: { fontFamily: theme.fontFamily.bodyBold, fontSize: 15.5, color: theme.colors.page },
  signOut: { minHeight: 44, marginTop: 4, alignItems: "center", justifyContent: "center" },
  signOutText: { fontFamily: theme.fontFamily.bodySemiBold, fontSize: 14, color: theme.colors.navy3 },
});
