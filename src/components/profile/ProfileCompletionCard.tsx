import { LinearGradient } from "expo-linear-gradient";
import { Pressable, StyleSheet, View } from "react-native";
import { theme } from "../../theme/theme";
import { AppText } from "../ui/AppText";
import { Icon } from "../ui/Icon";

export function ProfileCompletionCard({ answered, total, onPress }: { answered: number; total: number; onPress: () => void }) {
  if (answered >= total) {
    return (
      <Pressable onPress={onPress} style={styles.completeCard}>
        <View style={styles.completeIcon}><Icon name="check" size={18} color="#FFFFFF" strokeWidth={2.6} /></View>
        <View style={styles.completeCopy}>
          <AppText style={styles.completeTitle}>Profile complete</AppText>
          <AppText style={styles.completeSubtitle}>Tap to review your answers</AppText>
        </View>
        <Icon name="chevronRight" size={16} color="#8a9187" />
      </Pressable>
    );
  }

  const percentage = Math.round((answered / total) * 100);
  return (
    <Pressable onPress={onPress} style={styles.incompleteCard}>
      <LinearGradient colors={["#1d3327", "#152119"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFillObject} />
      <View style={styles.glow} />
      <View style={styles.incompleteCopy}>
        <View style={styles.incompleteTitleRow}>
          <AppText style={styles.incompleteTitle}>Complete your profile</AppText>
          <Icon name="chevronRight" size={17} color="#9fb0a3" />
        </View>
        <AppText style={styles.incompleteSubtitle}>Better suggestions with every answer.</AppText>
        <View style={styles.track}><View style={[styles.fill, { width: `${percentage}%` }]} /></View>
        <AppText style={styles.progress}>{answered} of {total} answered</AppText>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  completeCard: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, paddingVertical: 15, borderRadius: 16, borderWidth: 1, borderColor: "#D8E3CA", backgroundColor: "#EEF2E7" },
  completeIcon: { width: 34, height: 34, borderRadius: 10, backgroundColor: "#34B673", alignItems: "center", justifyContent: "center" },
  completeCopy: { flex: 1 },
  completeTitle: { fontFamily: theme.fontFamily.bodyBold, fontSize: 15, color: "#1B211C" },
  completeSubtitle: { marginTop: 2, fontSize: 12.5, color: "#5C6459" },
  incompleteCard: { position: "relative", overflow: "hidden", paddingHorizontal: 18, paddingTop: 18, paddingBottom: 16, borderRadius: 18, shadowColor: "#17291E", shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.24, shadowRadius: 13, elevation: 4 },
  glow: { position: "absolute", top: -30, right: -24, width: 120, height: 120, borderRadius: 60, backgroundColor: "rgba(52,182,115,0.12)" },
  incompleteCopy: { position: "relative" },
  incompleteTitleRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10, marginBottom: 4 },
  incompleteTitle: { fontFamily: theme.fontFamily.display, fontSize: 17, color: "#FBFBF7" },
  incompleteSubtitle: { marginBottom: 14, fontSize: 13, lineHeight: 18.2, color: "#9fb0a3" },
  track: { height: 7, overflow: "hidden", borderRadius: 999, backgroundColor: "rgba(255,255,255,0.14)" },
  fill: { height: "100%", borderRadius: 999, backgroundColor: "#34B673" },
  progress: { marginTop: 9, fontFamily: theme.fontFamily.mono, fontSize: 12, letterSpacing: 0.36, color: "#9fb0a3" },
});
