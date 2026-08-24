import { Pressable, StyleSheet, View } from "react-native";
import { theme } from "../../theme/theme";
import { AppText } from "../ui/AppText";

export function SignOutSheet({ pending, onCancel, onConfirm }: { pending: boolean; onCancel: () => void; onConfirm: () => void }) {
  return (
    <View style={styles.content}>
      <AppText style={styles.title}>Sign out of Sustena?</AppText>
      <AppText style={styles.copy}>Drafts saved only on this device may not be available after you sign out.</AppText>
      <View style={styles.actions}>
        <Pressable disabled={pending} onPress={onCancel} style={styles.cancel}><AppText style={styles.cancelText}>Stay signed in</AppText></Pressable>
        <Pressable disabled={pending} onPress={onConfirm} style={styles.confirm}><AppText style={styles.confirmText}>Sign out</AppText></Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: 18 },
  title: { marginBottom: 8, fontFamily: theme.fontFamily.display, fontSize: 18, color: "#17291E" },
  copy: { marginBottom: 20, fontSize: 14, lineHeight: 21, color: "#5C6459" },
  actions: { flexDirection: "row", gap: 10 },
  cancel: { flex: 1, paddingVertical: 13, borderRadius: 999, borderWidth: 1, borderColor: "#D8E3CA", backgroundColor: "#FFFFFF", alignItems: "center" },
  cancelText: { fontFamily: theme.fontFamily.bodySemiBold, fontSize: 14, color: "#1B211C" },
  confirm: { flex: 1, paddingVertical: 13, borderRadius: 999, backgroundColor: "#C0392E", alignItems: "center" },
  confirmText: { fontFamily: theme.fontFamily.bodyBold, fontSize: 14, color: "#FBFBF7" },
});
