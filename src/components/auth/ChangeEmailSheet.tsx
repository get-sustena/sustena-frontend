import { useState } from "react";
import { Pressable, StyleSheet, TextInput, View } from "react-native";
import { useUpdateMeMutation } from "../../hooks/api/useAuth";
import { getApiErrorMessage, getApiValidationFieldErrors } from "../../lib/api/errors";
import { isEmailAddress } from "../../lib/emailAddress";
import { useAuthStore } from "../../store/authStore";
import { closeSheet } from "../../store/uiStore";
import { theme } from "../../theme/theme";
import { AppText } from "../ui/AppText";

// "Use a different email" on the code screen: fixes a mistyped address. The
// server saves it and emails a new code there (PUT /auth/me works before the
// email is confirmed).
export function ChangeEmailSheet({ onChanged }: { onChanged: (email: string) => void }) {
  const user = useAuthStore((state) => state.user);
  const updateMe = useUpdateMeMutation();
  const [email, setEmail] = useState(user?.email ?? "");
  const [error, setError] = useState<string | null>(null);

  async function save() {
    const trimmed = email.trim();
    if (!isEmailAddress(trimmed)) {
      setError("Enter a valid email address.");
      return;
    }
    if (!user) return;
    if (trimmed.toLowerCase() === user.email.toLowerCase()) {
      closeSheet();
      return;
    }
    setError(null);
    try {
      await updateMe.mutateAsync({ fullName: user.fullName, email: trimmed });
      closeSheet();
      onChanged(trimmed);
    } catch (saveError) {
      setError(getApiValidationFieldErrors(saveError).email ?? getApiErrorMessage(saveError));
    }
  }

  const pending = updateMe.isPending;
  return (
    <View style={styles.content}>
      <AppText style={styles.title}>Use a different email</AppText>
      <AppText style={styles.body}>We&apos;ll send a new code to this address.</AppText>
      <AppText style={styles.label}>Email</AppText>
      <TextInput
        value={email}
        onChangeText={(value) => {
          setEmail(value);
          setError(null);
        }}
        keyboardType="email-address"
        autoCapitalize="none"
        autoComplete="email"
        autoFocus
        accessibilityLabel="Email"
        style={[styles.input, error && styles.inputInvalid]}
      />
      {error ? (
        <AppText accessibilityRole="alert" style={styles.error}>
          {error}
        </AppText>
      ) : null}
      <Pressable disabled={pending} onPress={() => void save()} style={[styles.save, pending && styles.pending]}>
        <AppText style={styles.saveText}>{pending ? "Sending..." : "Send code"}</AppText>
      </Pressable>
    </View>
  );
}

// The Profile Details sheet's field and button.
const styles = StyleSheet.create({
  content: { paddingBottom: 18 },
  title: { marginBottom: 6, fontFamily: theme.fontFamily.display, fontSize: 19, color: "#17291E" },
  body: { marginBottom: 16, fontFamily: theme.fontFamily.body, fontSize: 14, lineHeight: 20, color: theme.colors.textMedium },
  label: { marginBottom: 8, fontFamily: theme.fontFamily.body, fontSize: 13, color: theme.colors.text },
  input: { width: "100%", paddingHorizontal: 14, paddingVertical: 13, borderRadius: 12, borderWidth: 1, borderColor: "#E1E1E1", backgroundColor: "#EEF2E7", fontFamily: theme.fontFamily.body, fontSize: 14.5, color: "#17291E" },
  inputInvalid: { borderColor: theme.colors.red },
  error: { marginTop: 6, fontSize: 12.5, color: "#C0392E" },
  save: { width: "100%", marginTop: 20, paddingVertical: 14, borderRadius: 999, backgroundColor: "#17291E", alignItems: "center" },
  pending: { opacity: 0.6 },
  saveText: { fontFamily: theme.fontFamily.bodySemiBold, fontSize: 15, color: "#FBFBF7" },
});
