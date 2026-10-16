import { router } from "expo-router";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { theme } from "../../theme/theme";
import { AppText } from "../ui/AppText";
import { Icon } from "../ui/Icon";

export function SubscriptionScreen() {
  const insets = useSafeAreaInsets();
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
          <AppText style={styles.body}>Everything you use now stays free.</AppText>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.colors.page },
  header: { paddingHorizontal: 20, paddingBottom: 12, flexDirection: "row", alignItems: "center", gap: 8 },
  headerButton: { width: 44, height: 44, borderRadius: 12, borderWidth: 1, borderColor: "#E1E1E1", backgroundColor: "#FFFFFF", alignItems: "center", justifyContent: "center" },
  headerTitle: { flex: 1, paddingHorizontal: 10, fontFamily: theme.fontFamily.display, fontSize: 18, letterSpacing: -0.18, textAlign: "center", color: "#17291E" },
  headerSpacer: { width: 44 },
  content: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 40 },
  receipt: { marginBottom: 18, padding: 20, borderRadius: 20, borderWidth: 1.5, borderColor: "#E1E1E1", backgroundColor: "#FBFBF7" },
  plan: { marginBottom: 12, fontFamily: theme.fontFamily.display, fontSize: 21, lineHeight: 25.2, color: "#17291E" },
  badge: { alignSelf: "flex-start", marginBottom: 14, paddingHorizontal: 12, paddingVertical: 5, borderRadius: 999, backgroundColor: "#F1F4EC", fontFamily: theme.fontFamily.bodySemiBold, fontSize: 12, color: "#8a9187" },
  body: { fontSize: 13, lineHeight: 19.5, color: "#5C6459" },
});
