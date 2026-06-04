import { Pressable, StyleSheet, View, ViewStyle } from "react-native";
import { theme } from "../../theme/theme";
import { AppText } from "../ui/AppText";

type Props = {
  icon: string;
  label: string;
  title: string;
  onPress?: () => void;
  style?: ViewStyle;
};

export function PlannerGoalCard({ icon, label, title, onPress, style }: Props) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && styles.pressed, style]}
    >
      <View style={styles.decorCircle} />

      <AppText style={styles.icon}>{icon}</AppText>
      <AppText style={styles.label}>{label}</AppText>
      <AppText style={styles.title}>{title}</AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    minHeight: 126,
    paddingHorizontal: 16,
    paddingVertical: 18,
    borderRadius: theme.radius.lg,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    overflow: "hidden",
  },
  decorCircle: {
    position: "absolute",
    bottom: -14,
    right: -14,
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: theme.colors.navyDim,
  },
  pressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
    borderColor: theme.colors.navy,
  },
  icon: {
    fontSize: 26,
    marginBottom: 10,
  },
  label: {
    fontFamily: theme.fontFamily.bodyBold,
    fontSize: 9,
    color: theme.colors.textMuted,
    letterSpacing: 1,
    textTransform: "uppercase",
    marginBottom: 3,
  },
  title: {
    fontFamily: theme.fontFamily.bodyBold,
    fontSize: 13,
    lineHeight: 17,
    color: theme.colors.navy,
  },
});
