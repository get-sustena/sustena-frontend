import { Modal, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { theme } from "../../theme/theme";
import { AppText } from "../ui/AppText";
import { Icon } from "../ui/Icon";

export function ProfileDatePickerModal({ visible, values, selected, onSelect, onClose }: { visible: boolean; values: { value: number; label: string }[]; selected: number; onSelect: (value: number) => void; onClose: () => void }) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.screen}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View style={styles.panel}>
          <ScrollView showsVerticalScrollIndicator={false}>
            {values.map((item) => {
              const active = item.value === selected;
              return <Pressable key={item.value} onPress={() => { onSelect(item.value); onClose(); }} style={styles.row}><AppText style={[styles.label, active && styles.active]}>{item.label}</AppText>{active ? <Icon name="check" size={17} color="#279a5f" /> : null}</Pressable>;
            })}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, justifyContent: "center", paddingHorizontal: 36, backgroundColor: "rgba(0,0,0,0.45)" },
  panel: { maxHeight: 430, overflow: "hidden", borderRadius: 18, backgroundColor: "#FFFFFF", paddingHorizontal: 18, paddingVertical: 8 },
  row: { minHeight: 50, flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderBottomWidth: 1, borderBottomColor: "#D8E3CA" },
  label: { fontSize: 14.5, color: "#17291E" },
  active: { fontFamily: theme.fontFamily.bodySemiBold, color: "#1f7048" },
});
