import { router } from "expo-router";
import { useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useDeleteAccountMutation } from "../../hooks/api/useAuth";
import { getApiErrorMessage, isApiClientError } from "../../lib/api/errors";
import { closeSheet, openSheet, showToast } from "../../store/uiStore";
import { theme } from "../../theme/theme";
import { AppText } from "../ui/AppText";
import { Icon, IconName } from "../ui/Icon";

// What goes with the account, for the current app (no Premium, orders or
// payments yet; v6.9's lines about those come with them).
const REMOVED: { icon: IconName; text: string }[] = [
  { icon: "close", text: "Your profile, preferences and pantry are removed." },
  { icon: "close", text: "Your meal plans, shopping lists and saved recipes are removed." },
  { icon: "close", text: "Recipes you published are taken off Sustena." },
];

// v6.9's Delete account (openDeleteAccount): what goes, the password, then a
// last check in a sheet. Afterwards the person is signed out.
export function DeleteAccountScreen() {
  const insets = useSafeAreaInsets();
  const deleteAccount = useDeleteAccountMutation();
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function submit() {
    if (!password) {
      setError("Enter your password.");
      return;
    }
    openSheet(<DeleteAccountSheet onKeep={closeSheet} onDelete={() => void confirmDelete()} />);
  }

  async function confirmDelete() {
    closeSheet();
    try {
      await deleteAccount.mutateAsync({ password });
      router.replace("/auth");
      showToast("Account deleted. You’re signed out.", "success");
    } catch (failure) {
      setError(
        isApiClientError(failure) && failure.code === "CURRENT_PASSWORD_INCORRECT"
          ? "Incorrect password. Try again."
          : getApiErrorMessage(failure)
      );
    }
  }

  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <Pressable accessibilityLabel="Back to settings" onPress={() => router.back()} style={styles.headerButton}>
          <Icon name="chevronLeft" size={20} color={theme.colors.navy} />
        </Pressable>
      </View>
      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        <AppText accessibilityRole="header" style={styles.title}>Delete your account</AppText>
        <AppText style={styles.lead}>This can’t be undone. When you delete your account:</AppText>
        <View style={styles.list}>
          {REMOVED.map((item) => (
            <View key={item.text} style={styles.listItem}>
              <View style={styles.listIcon}>
                <Icon name={item.icon} size={14} color={theme.colors.text} strokeWidth={2.2} />
              </View>
              <AppText style={styles.listText}>{item.text}</AppText>
            </View>
          ))}
        </View>

        <AppText style={styles.label}>Password</AppText>
        <View style={[styles.passwordField, error && styles.passwordFieldError]}>
          <TextInput
            value={password}
            onChangeText={(value) => {
              setPassword(value);
              setError(null);
            }}
            secureTextEntry={!showPassword}
            placeholder="Enter your password"
            placeholderTextColor={theme.colors.textMuted}
            autoComplete="current-password"
            autoCapitalize="none"
            autoCorrect={false}
            accessibilityLabel="Password"
            style={styles.passwordInput}
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={showPassword ? "Hide password" : "Show password"}
            onPress={() => setShowPassword((current) => !current)}
            style={styles.eye}
          >
            <Icon name={showPassword ? "eyeOff" : "eye"} size={17} color={theme.colors.navy} />
          </Pressable>
        </View>
        {error ? (
          <AppText accessibilityRole="alert" style={styles.error}>
            {error}
          </AppText>
        ) : null}
        <Pressable accessibilityRole="link" onPress={() => router.push("/auth-forgot")} style={styles.forgot}>
          <AppText style={styles.forgotText}>Forgot password?</AppText>
        </Pressable>
      </ScrollView>
      <View style={[styles.foot, { paddingBottom: insets.bottom + 18 }]}>
        <Pressable accessibilityRole="button" disabled={deleteAccount.isPending} onPress={submit} style={[styles.delete, deleteAccount.isPending && styles.disabled]}>
          <AppText style={styles.deleteText}>{deleteAccount.isPending ? "Deleting account..." : "Delete account"}</AppText>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

function DeleteAccountSheet({ onKeep, onDelete }: { onKeep: () => void; onDelete: () => void }) {
  return (
    <View style={styles.sheet}>
      <AppText style={styles.sheetTitle}>Delete your account?</AppText>
      <AppText style={styles.sheetLead}>Your account and everything in it will be deleted. You can’t undo this.</AppText>
      <View style={styles.sheetActions}>
        <Pressable onPress={onKeep} style={styles.keep}><AppText style={styles.keepText}>Keep account</AppText></Pressable>
        <Pressable onPress={onDelete} style={styles.confirm}><AppText style={styles.confirmText}>Delete account</AppText></Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.colors.surface },
  header: { paddingHorizontal: 16, paddingBottom: 10, flexDirection: "row" },
  headerButton: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  body: { paddingHorizontal: 20, paddingTop: 4, paddingBottom: 40 },
  title: { fontFamily: theme.fontFamily.display, fontSize: 28, lineHeight: 31.4, letterSpacing: -0.7, color: theme.colors.navy },
  lead: { marginTop: 10, fontFamily: theme.fontFamily.body, fontSize: 15, lineHeight: 22.5, color: theme.colors.text },
  list: { marginTop: 18, gap: 12 },
  listItem: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  listIcon: { width: 24, height: 24, borderRadius: 12, backgroundColor: theme.colors.control, alignItems: "center", justifyContent: "center" },
  listText: { flex: 1, fontFamily: theme.fontFamily.body, fontSize: 15, lineHeight: 21.75, color: theme.colors.navy },
  label: { marginTop: 24, marginBottom: 8, fontFamily: theme.fontFamily.bodySemiBold, fontSize: 13, color: theme.colors.textMuted },
  passwordField: {
    flexDirection: "row",
    alignItems: "center",
    paddingLeft: 14,
    paddingRight: 4,
    borderRadius: 14,
    borderWidth: 0.75,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  passwordFieldError: { borderColor: theme.colors.red },
  passwordInput: { flex: 1, minWidth: 0, paddingVertical: 15, fontFamily: theme.fontFamily.body, fontSize: 15, color: theme.colors.navy },
  eye: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  error: { marginTop: 12, fontFamily: theme.fontFamily.bodyMedium, fontSize: 13, lineHeight: 18.2, color: theme.colors.red },
  forgot: { alignSelf: "flex-start", minHeight: 40, marginTop: 4, justifyContent: "center" },
  forgotText: { fontFamily: theme.fontFamily.bodySemiBold, fontSize: 14, color: theme.colors.navy3 },
  foot: { paddingTop: 12, paddingHorizontal: 20, backgroundColor: theme.colors.surface },
  delete: { minHeight: 52, borderRadius: 999, backgroundColor: theme.colors.red, alignItems: "center", justifyContent: "center" },
  disabled: { opacity: 0.45 },
  deleteText: { fontFamily: theme.fontFamily.bodyBold, fontSize: 15.5, color: theme.colors.white },
  sheet: { paddingBottom: 18 },
  sheetTitle: { marginBottom: 4, fontFamily: theme.fontFamily.display, fontSize: 20, lineHeight: 24, color: theme.colors.navy },
  sheetLead: { marginTop: 6, marginBottom: 20, fontFamily: theme.fontFamily.body, fontSize: 14, lineHeight: 21, color: theme.colors.text },
  sheetActions: { flexDirection: "row", gap: 10 },
  keep: { flex: 1, paddingVertical: 13, borderRadius: 999, borderWidth: 1, borderColor: theme.colors.border, backgroundColor: theme.colors.white, alignItems: "center" },
  keepText: { fontFamily: theme.fontFamily.bodySemiBold, fontSize: 14, color: theme.colors.text },
  confirm: { flex: 1, paddingVertical: 13, borderRadius: 999, backgroundColor: theme.colors.red, alignItems: "center" },
  confirmText: { fontFamily: theme.fontFamily.bodyBold, fontSize: 14, color: theme.colors.onDark },
});
