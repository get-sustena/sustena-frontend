import { Pressable, StyleSheet, View } from "react-native";
import { closeSheet } from "../../store/uiStore";
import { theme } from "../../theme/theme";
import { AppText } from "../ui/AppText";
import { Icon } from "../ui/Icon";

export function NotificationsSheet() {
  return (
    <View style={styles.sheet}>
      <View style={styles.header}>
        <AppText style={styles.title}>Notifications</AppText>
        <Pressable onPress={closeSheet} style={styles.close} accessibilityLabel="Close notifications">
          <Icon name="close" size={18} color={theme.colors.text} />
        </Pressable>
      </View>
      <View style={styles.empty}>
        <View style={styles.emptyIcon}>
          <Icon name="notification" size={28} color={theme.colors.linkGreen} />
        </View>
        <AppText style={styles.emptyTitle}>No notifications yet</AppText>
        <AppText style={styles.emptyCopy}>
          Updates about your meal plans, recipes and shopping lists will appear here.
        </AppText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  sheet: { paddingBottom: theme.spacing.xl },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 14, marginBottom: 16 },
  title: { fontFamily: theme.fontFamily.display, fontSize: 21, color: theme.colors.text },
  close: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  empty: { minHeight: 310, alignItems: "center", justifyContent: "center", paddingHorizontal: 20, paddingBottom: 34 },
  emptyIcon: { width: 64, height: 64, borderRadius: 20, backgroundColor: theme.colors.card2, alignItems: "center", justifyContent: "center", marginBottom: 18 },
  emptyTitle: { fontFamily: theme.fontFamily.display, fontSize: 19, color: theme.colors.text },
  emptyCopy: { maxWidth: 245, marginTop: 7, fontFamily: theme.fontFamily.body, fontSize: 13.5, lineHeight: 20, color: theme.colors.textMedium, textAlign: "center" },
});
