import { Pressable, StyleSheet, View } from "react-native";
import { theme } from "../../theme/theme";
import { AppText } from "../ui/AppText";

export function DiscardProfileChangesSheet({ onKeepEditing, onDiscard }: { onKeepEditing: () => void; onDiscard: () => void }) {
  return (
    <View style={styles.content}>
      <AppText style={styles.title}>Discard profile changes?</AppText>
      <AppText style={styles.copy}>Your unsaved profile changes will be lost.</AppText>
      <View style={styles.actions}>
        <Pressable onPress={onKeepEditing} style={styles.keep}><AppText style={styles.keepText}>Keep editing</AppText></Pressable>
        <Pressable onPress={onDiscard} style={styles.discard}><AppText style={styles.discardText}>Discard changes</AppText></Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: 18 },
  title: { marginBottom: 8, fontFamily: theme.fontFamily.display, fontSize: 18, color: "#17291E" },
  copy: { marginBottom: 20, fontSize: 14, lineHeight: 21, color: "#5C6459" },
  actions: { flexDirection: "row", gap: 10 },
  keep: { flex: 1, paddingVertical: 13, borderRadius: 999, borderWidth: 1, borderColor: "#D8E3CA", backgroundColor: "#FFFFFF", alignItems: "center" },
  keepText: { fontFamily: theme.fontFamily.bodySemiBold, fontSize: 14, color: "#17291E" },
  discard: { flex: 1, paddingVertical: 13, borderRadius: 999, backgroundColor: "#C0392E", alignItems: "center" },
  discardText: { fontFamily: theme.fontFamily.bodyBold, fontSize: 14, color: "#FBFBF7" },
});
