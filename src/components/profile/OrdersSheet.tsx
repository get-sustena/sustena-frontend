import { StyleSheet, View } from "react-native";
import { theme } from "../../theme/theme";
import { AppText } from "../ui/AppText";

const ORDERS = ["#SU-2291", "#SU-2214", "#SU-2188"];

export function OrdersSheet() {
  return (
    <View style={styles.content}>
      <AppText style={styles.title}>Orders</AppText>
      {ORDERS.map((number) => (
        <View key={number} style={styles.row}>
          <AppText style={styles.number}>{number}</AppText>
          <AppText style={styles.status}>Delivered</AppText>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: 18 },
  title: { marginBottom: 14, fontFamily: theme.fontFamily.display, fontSize: 18, color: "#17291E" },
  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: "#D8E3CA" },
  number: { fontSize: 14, color: "#17291E" },
  status: { fontFamily: theme.fontFamily.mono, fontSize: 12, color: "#1f7048" },
});
