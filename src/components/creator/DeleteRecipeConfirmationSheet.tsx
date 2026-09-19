import { Pressable, StyleSheet, View } from "react-native";
import { theme } from "../../theme/theme";
import { AppText } from "../ui/AppText";

export function DeleteRecipeConfirmationSheet({ name, draft, onCancel, onDelete }: { name: string; draft: boolean; onCancel: () => void; onDelete: () => void }) {
  return (
    <View style={styles.content}>
      <AppText style={styles.title}>{draft ? "Delete this draft?" : "Delete this published recipe?"}</AppText>
      <AppText style={styles.copy}>{draft ? `“${name || "Untitled recipe"}” and all of its recipe details will be permanently deleted.` : `“${name}” will be removed from your profile and cannot be recovered.`}</AppText>
      <View style={styles.actions}>
        <Pressable onPress={onCancel} style={styles.cancel}><AppText style={styles.cancelText}>{draft ? "Keep draft" : "Keep recipe"}</AppText></Pressable>
        <Pressable onPress={onDelete} style={styles.delete}><AppText style={styles.deleteText}>{draft ? "Delete draft" : "Delete recipe"}</AppText></Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: 18 },
  title: { marginBottom: 8, fontFamily: theme.fontFamily.display, fontSize: 18, color: "#17291E" },
  copy: { marginBottom: 20, fontSize: 14, lineHeight: 21, color: "#5C6459" },
  actions: { flexDirection: "row", gap: 10 },
  cancel: { flex: 1, paddingVertical: 13, borderRadius: 999, borderWidth: 1, borderColor: "#E1E1E1", backgroundColor: "#FFFFFF", alignItems: "center" },
  cancelText: { fontFamily: theme.fontFamily.bodySemiBold, fontSize: 14, color: "#17291E" },
  delete: { flex: 1, paddingVertical: 13, borderRadius: 999, backgroundColor: "#C0392E", alignItems: "center" },
  deleteText: { fontFamily: theme.fontFamily.bodyBold, fontSize: 14, color: "#FBFBF7" },
});
