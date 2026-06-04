import { StyleSheet, View } from "react-native";
import { theme } from "../../theme/theme";
import { AppText } from "../ui/AppText";
import { Button } from "../ui/Button";

export function CaloriesPlannerPane() {
  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <AppText style={styles.icon}>🔥</AppText>

        <AppText style={styles.title}>Calorie planner is coming soon</AppText>

        <AppText style={styles.message}>
          This will suggest meals based on calories, macros, dietary
          preferences, and health goals. For now, we’re focusing on budget,
          inventory, and timetable planning first.
        </AppText>

        <Button title="Coming Soon" disabled style={styles.button} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    paddingBottom: theme.spacing["3xl"],
  },
  card: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.lg,
    padding: theme.spacing["2xl"],
    alignItems: "center",
  },
  icon: {
    fontSize: 48,
    marginBottom: theme.spacing.md,
  },
  title: {
    fontFamily: theme.fontFamily.display,
    fontSize: 22,
    color: theme.colors.navy,
    textAlign: "center",
    marginBottom: theme.spacing.sm,
  },
  message: {
    fontFamily: theme.fontFamily.body,
    fontSize: 13,
    lineHeight: 21,
    color: theme.colors.textMuted,
    textAlign: "center",
  },
  button: {
    marginTop: theme.spacing.xl,
  },
});
