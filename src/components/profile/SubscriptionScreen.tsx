import { router } from "expo-router";
import { Platform, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { theme } from "../../theme/theme";
import { AppText } from "../ui/AppText";
import { Icon } from "../ui/Icon";

export function SubscriptionScreen() {
  const insets = useSafeAreaInsets();
  const billingProvider = Platform.select({
    ios: "the App Store",
    android: "Google Play",
    default: "your Sustena account",
  });
  return (
    <View style={styles.screen}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Pressable accessibilityLabel="Go back" onPress={() => router.back()} style={styles.headerButton}><Icon name="chevronLeft" size={19} /></Pressable>
        <AppText style={styles.headerTitle}>Subscription</AppText>
        <View style={styles.headerSpacer} />
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.receipt}>
          <AppText style={styles.plan}>Sustena Free</AppText>
          <AppText style={styles.badge}>Sustena Free</AppText>
          <AppText style={styles.body}>Everything you use now stays free. Upgrade to Plus to remove the limits whenever you are ready.</AppText>
          <View style={styles.receiptRow}><AppText style={styles.receiptLabel}>Plus price</AppText><AppText style={styles.receiptValue}>₦3,500 per month</AppText></View>
        </View>
        <Pressable style={styles.primary}><AppText style={styles.primaryText}>See Sustena Plus</AppText></Pressable>
        <Pressable style={styles.restore}><AppText style={styles.restoreText}>Restore purchases</AppText></Pressable>
        <AppText style={styles.note}>Subscriptions are billed and managed through {billingProvider}. Sustena does not store your card details.</AppText>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#FBFCFA" },
  header: { paddingHorizontal: 20, paddingBottom: 12, flexDirection: "row", alignItems: "center", gap: 8 },
  headerButton: { width: 44, height: 44, borderRadius: 12, borderWidth: 1, borderColor: "#D8E3CA", backgroundColor: "#FFFFFF", alignItems: "center", justifyContent: "center" },
  headerTitle: { flex: 1, paddingHorizontal: 10, fontFamily: theme.fontFamily.display, fontSize: 18, letterSpacing: -0.18, textAlign: "center", color: "#17291E" },
  headerSpacer: { width: 44 },
  content: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 40 },
  receipt: { marginBottom: 18, padding: 20, borderRadius: 20, borderWidth: 1.5, borderColor: "#D8E3CA", backgroundColor: "#FBFBF7" },
  plan: { marginBottom: 12, fontFamily: theme.fontFamily.display, fontSize: 21, lineHeight: 25.2, color: "#17291E" },
  badge: { alignSelf: "flex-start", marginBottom: 14, paddingHorizontal: 12, paddingVertical: 5, borderRadius: 999, backgroundColor: "#F1F4EC", fontFamily: theme.fontFamily.bodySemiBold, fontSize: 12, color: "#8a9187" },
  body: { marginBottom: 16, fontSize: 13, lineHeight: 19.5, color: "#5C6459" },
  receiptRow: { paddingVertical: 8, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
  receiptLabel: { fontSize: 13.5, color: "#5C6459" },
  receiptValue: { fontFamily: theme.fontFamily.bodySemiBold, fontSize: 14, textAlign: "right", color: "#17291E" },
  primary: { width: "100%", marginBottom: 10, paddingVertical: 15, borderRadius: 999, backgroundColor: "#E3A62E", alignItems: "center" },
  primaryText: { fontFamily: theme.fontFamily.bodyBold, fontSize: 15, color: "#17291E" },
  restore: { alignItems: "center", marginTop: 4 },
  restoreText: { fontSize: 12.5, textDecorationLine: "underline", color: "#8a9187" },
  note: { marginTop: 14, fontSize: 11.5, lineHeight: 17.25, textAlign: "center", color: "#8a9187" },
});
