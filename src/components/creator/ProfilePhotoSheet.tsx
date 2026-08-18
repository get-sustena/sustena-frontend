import { Pressable, StyleSheet, View } from "react-native";
import { theme } from "../../theme/theme";
import { AppText } from "../ui/AppText";

export function ProfilePhotoSheet({ onTakePhoto, onChoosePhoto, onRemovePhoto }: { onTakePhoto: () => void; onChoosePhoto: () => void; onRemovePhoto: () => void }) {
  return (
    <View style={styles.content}>
      <AppText style={styles.title}>Profile photo</AppText>
      <MenuRow label="Take photo" onPress={onTakePhoto} />
      <MenuRow label="Choose photo" onPress={onChoosePhoto} />
      <MenuRow label="Remove photo" onPress={onRemovePhoto} danger />
    </View>
  );
}

function MenuRow({ label, onPress, danger = false }: { label: string; onPress: () => void; danger?: boolean }) {
  return <Pressable onPress={onPress} style={styles.row}><AppText style={[styles.rowText, danger && styles.danger]}>{label}</AppText></Pressable>;
}

const styles = StyleSheet.create({
  content: { paddingBottom: 18 },
  title: { marginBottom: 14, fontFamily: theme.fontFamily.display, fontSize: 18, textAlign: "center", color: "#17291E" },
  row: { minHeight: 50, justifyContent: "center", paddingHorizontal: 2, borderBottomWidth: 1, borderBottomColor: "#D8E3CA" },
  rowText: { fontFamily: theme.fontFamily.bodySemiBold, fontSize: 14, color: "#17291E" },
  danger: { color: "#C0392E" },
});
