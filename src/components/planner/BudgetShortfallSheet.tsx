import { Pressable, StyleSheet, View } from "react-native";
import { formatNaira } from "../../lib/formatters";
import { theme } from "../../theme/theme";
import type { BudgetMealSlot } from "../../types/api";
import { AppText } from "../ui/AppText";
import { Icon } from "../ui/Icon";

type Props = {
  currentBudget: number;
  recommendedBudget: number;
  days: number;
  mealSlots: BudgetMealSlot[];
  onUseRecommended: () => void;
  onKeepBudget: () => void;
};

export function BudgetShortfallSheet({
  currentBudget,
  recommendedBudget,
  days,
  mealSlots,
  onUseRecommended,
  onKeepBudget,
}: Props) {
  const mealLabel = formatMealLabel(mealSlots);
  const planSuffix = days > 1 ? ` across your ${days}-day plan` : "";

  return (
    <View style={styles.sheet}>
      <View style={styles.iconWrap}>
        <Icon name="budget" size={28} color={theme.colors.goldText} />
      </View>

      <AppText style={styles.title}>This budget is a little too tight</AppText>
      <AppText style={styles.copy}>
        We couldn’t put together {mealLabel} for {formatNaira(currentBudget)}
        {planSuffix}. Here’s the smallest total budget we can cook it within:
      </AppText>

      <View style={styles.recommendationCard}>
        <AppText style={styles.eyebrow}>Recommended budget</AppText>
        <View style={styles.budgetRow}>
          <AppText style={styles.budget}>{formatNaira(recommendedBudget)}</AppText>
          {days > 1 ? <AppText style={styles.total}>total</AppText> : null}
        </View>
        <View style={styles.divider} />
        <View style={styles.extraRow}>
          <AppText style={styles.extra}>
            +{formatNaira(recommendedBudget - currentBudget)}
          </AppText>
          <AppText style={styles.extraCopy}>
            on top of your {formatNaira(currentBudget)}
          </AppText>
        </View>
      </View>

      <Pressable onPress={onUseRecommended} style={styles.primaryButton}>
        <AppText style={styles.primaryText}>
          Use {formatNaira(recommendedBudget)} &amp; try again
        </AppText>
      </Pressable>
      <Pressable onPress={onKeepBudget} style={styles.secondaryButton}>
        <AppText style={styles.secondaryText}>
          Keep my {formatNaira(currentBudget)} budget
        </AppText>
      </Pressable>
    </View>
  );
}

function formatMealLabel(slots: BudgetMealSlot[]) {
  const labels = slots.map(
    (slot) => slot.charAt(0).toUpperCase() + slot.slice(1)
  );
  if (labels.length === 1) return labels[0];
  if (labels.length === 2) return `${labels[0]} and ${labels[1]}`;
  return `${labels.slice(0, -1).join(", ")} and ${labels.at(-1)}`;
}

const styles = StyleSheet.create({
  sheet: { paddingBottom: 24, alignItems: "center" },
  iconWrap: {
    width: 62,
    height: 62,
    borderRadius: 18,
    backgroundColor: "rgba(227,166,46,0.16)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 18,
  },
  title: {
    fontFamily: theme.fontFamily.display,
    fontSize: 22,
    color: theme.colors.navy,
    textAlign: "center",
  },
  copy: {
    fontFamily: theme.fontFamily.body,
    fontSize: 14,
    lineHeight: 21,
    color: theme.colors.textMedium,
    textAlign: "center",
    marginTop: 9,
    marginBottom: 20,
  },
  recommendationCard: {
    width: "100%",
    borderRadius: 20,
    backgroundColor: theme.colors.navy,
    padding: 20,
    marginBottom: 18,
  },
  eyebrow: {
    fontFamily: theme.fontFamily.body,
    fontSize: 11,
    letterSpacing: 1.1,
    textTransform: "uppercase",
    color: theme.colors.accent,
  },
  budgetRow: { flexDirection: "row", alignItems: "baseline", gap: 8, marginTop: 5 },
  budget: { fontFamily: theme.fontFamily.display, fontSize: 34, color: theme.colors.onDark },
  total: { fontFamily: theme.fontFamily.body, fontSize: 13, color: "#AAB5AC" },
  divider: { height: 1, backgroundColor: "rgba(255,255,255,0.14)", marginVertical: 15 },
  extraRow: { flexDirection: "row", alignItems: "baseline", gap: 7 },
  extra: { fontFamily: theme.fontFamily.bodyBold, fontSize: 15, color: theme.colors.accent },
  extraCopy: { fontFamily: theme.fontFamily.body, fontSize: 13, color: "#AAB5AC" },
  primaryButton: {
    width: "100%",
    minHeight: 55,
    borderRadius: 999,
    backgroundColor: theme.colors.navy,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryText: { fontFamily: theme.fontFamily.bodyBold, fontSize: 15, color: theme.colors.onDark },
  secondaryButton: {
    width: "100%",
    minHeight: 55,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 10,
  },
  secondaryText: { fontFamily: theme.fontFamily.bodySemiBold, fontSize: 14, color: theme.colors.text },
});
