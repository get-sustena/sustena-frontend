import { router } from "expo-router";
import { useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useChangePasswordMutation } from "../../hooks/api/useAuth";
import { getApiErrorMessage } from "../../lib/api/errors";
import { showToast } from "../../store/uiStore";
import { theme } from "../../theme/theme";
import { AppText } from "../ui/AppText";
import { Icon } from "../ui/Icon";

type Errors = { current?: string; next?: string; confirm?: string };

export function PasswordSecurityScreen() {
  const insets = useSafeAreaInsets();
  const mutation = useChangePasswordMutation();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [errors, setErrors] = useState<Errors>({});

  async function updatePassword() {
    const nextErrors: Errors = {};
    if (!current) nextErrors.current = "Enter your current password.";
    if (!next) nextErrors.next = "Enter a new password.";
    else if (!isStrongPassword(next)) nextErrors.next = "Use at least 8 characters, including an uppercase letter, lowercase letter, number and symbol.";
    if (confirm !== next) nextErrors.confirm = "Passwords do not match.";
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;
    try {
      await mutation.mutateAsync({ currentPassword: current, newPassword: next });
      showToast("Password updated", "success");
      router.back();
    } catch (error) {
      showToast(getApiErrorMessage(error), "danger");
    }
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.screen}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Pressable accessibilityLabel="Go back" onPress={() => router.back()} style={styles.headerButton}><Icon name="chevronLeft" size={19} /></Pressable>
        <AppText style={styles.headerTitle}>Password and security</AppText>
        <View style={styles.headerSpacer} />
      </View>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
        <PasswordField label="Current password" value={current} onChangeText={setCurrent} error={errors.current} />
        <PasswordField label="New password" value={next} onChangeText={setNext} error={errors.next} />
        <PasswordField label="Confirm new password" value={confirm} onChangeText={setConfirm} error={errors.confirm} last />
        <Pressable disabled={mutation.isPending} onPress={updatePassword} style={styles.update}><AppText style={styles.updateText}>Update password</AppText></Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function PasswordField({ label, value, onChangeText, error, last = false }: { label: string; value: string; onChangeText: (value: string) => void; error?: string; last?: boolean }) {
  return <View style={[styles.field, last && styles.lastField]}><AppText style={styles.label}>{label}</AppText><TextInput value={value} onChangeText={onChangeText} secureTextEntry style={styles.input} />{error ? <AppText style={styles.error}>{error}</AppText> : null}</View>;
}

function isStrongPassword(value: string) { return value.length >= 8 && /[A-Z]/.test(value) && /[a-z]/.test(value) && /[0-9]/.test(value) && /[^A-Za-z0-9]/.test(value); }

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#FFFFFF" },
  header: { paddingHorizontal: 20, paddingBottom: 16, flexDirection: "row", alignItems: "center", gap: 8 },
  headerButton: { width: 44, height: 44, borderRadius: 12, borderWidth: 1, borderColor: "#D8E3CA", backgroundColor: "#FBFBF7", alignItems: "center", justifyContent: "center" },
  headerTitle: { flex: 1, paddingHorizontal: 10, fontFamily: theme.fontFamily.display, fontSize: 18, letterSpacing: -0.18, textAlign: "center", color: "#17291E" },
  headerSpacer: { width: 44, height: 44 },
  content: { paddingHorizontal: 20, paddingTop: 10, paddingBottom: 20 },
  field: { marginBottom: 16 },
  lastField: { marginBottom: 20 },
  label: { marginBottom: 6, fontFamily: theme.fontFamily.bodySemiBold, fontSize: 13, color: "#1B211C" },
  input: { width: "100%", paddingHorizontal: 16, paddingVertical: 14, borderRadius: 14, borderWidth: 1.5, borderColor: "#D8E3CA", backgroundColor: "#FFFFFF", fontFamily: theme.fontFamily.body, fontSize: 14.5, color: "#17291E" },
  error: { marginTop: 6, fontSize: 12.5, color: "#C0392E" },
  update: { width: "100%", paddingVertical: 14, borderRadius: 999, backgroundColor: "#17291E", alignItems: "center" },
  updateText: { fontFamily: theme.fontFamily.bodyBold, fontSize: 15, color: "#FBFBF7" },
});
