import { router } from "expo-router";
import { useMemo, useState } from "react";
import { Pressable, StyleSheet, TextInput, View } from "react-native";
import { Recipe } from "../../data/recipes";
import { formatNaira } from "../../lib/formatters";
import { theme } from "../../theme/theme";
import { AppText } from "../ui/AppText";
import { Button } from "../ui/Button";
import { EmptyState } from "../ui/EmptyState";

const BUDGET_PRESETS = [1500, 3000, 5000, 8000];

type Props = {
  recipes: Recipe[];
};

export function BudgetPlannerPane({ recipes }: Props) {
  const [budget, setBudget] = useState("");

  const numericBudget = Number(budget);

  const matchingRecipes = useMemo(() => {
    if (!numericBudget || numericBudget <= 0) {
      return [];
    }

    return recipes
      .filter((recipe) => recipe.cost <= numericBudget)
      .sort((a, b) => a.cost - b.cost);
  }, [numericBudget, recipes]);

  return (
    <View style={styles.container}>
      <View style={styles.inputCard}>
        <AppText style={styles.inputLabel}>Enter your budget</AppText>

        <View style={styles.inputRow}>
          <AppText style={styles.naira}>₦</AppText>

          <TextInput
            value={budget}
            onChangeText={setBudget}
            placeholder="0"
            keyboardType="number-pad"
            placeholderTextColor={theme.colors.textDim}
            style={styles.input}
          />
        </View>

        <AppText style={styles.hint}>
          We’ll show you delicious meals within your range.
        </AppText>
      </View>

      <View style={styles.presets}>
        {BUDGET_PRESETS.map((preset) => {
          const isActive = numericBudget === preset;

          return (
            <Pressable
              key={preset}
              onPress={() => setBudget(String(preset))}
              style={[
                styles.presetButton,
                isActive && styles.activePresetButton,
              ]}
            >
              <AppText
                style={[
                  styles.presetLabel,
                  isActive && styles.activePresetLabel,
                ]}
              >
                {formatNaira(preset)}
              </AppText>
            </Pressable>
          );
        })}
      </View>

      <AppText style={styles.resultsLabel}>Suggested Meals</AppText>

      {!numericBudget ? (
        <EmptyState
          icon="💸"
          title="Enter a budget"
          message="Add how much you have and we’ll suggest meals you can cook."
        />
      ) : matchingRecipes.length === 0 ? (
        <EmptyState
          icon="😔"
          title="No meals found"
          message="Try increasing your budget or checking back when we add more recipes."
        />
      ) : (
        matchingRecipes.map((recipe) => (
          <Pressable
            key={recipe.id}
            onPress={() =>
              router.push({
                pathname: "/recipes/[id]",
                params: { id: recipe.id },
              })
            }
            style={({ pressed }) => [
              styles.resultCard,
              pressed && styles.pressed,
            ]}
          >
            <AppText style={styles.resultEmoji}>{recipe.emoji}</AppText>

            <View style={styles.resultInfo}>
              <AppText style={styles.resultName}>{recipe.name}</AppText>
              <AppText style={styles.resultMeta}>
                ⏱ {recipe.time} · 🔥 {recipe.calories} kcal
              </AppText>
            </View>

            <View style={styles.resultPriceWrap}>
              <AppText style={styles.resultPrice}>
                {formatNaira(recipe.cost)}
              </AppText>
              <AppText style={styles.resultDifficulty}>
                {recipe.difficulty}
              </AppText>
            </View>
          </Pressable>
        ))
      )}

      {numericBudget > 0 && matchingRecipes.length > 0 ? (
        <Button
          title="Generate Budget Plan"
          style={styles.generateButton}
          onPress={() => {
            // Placeholder for later.
          }}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
  },
  inputCard: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.lg,
  },
  inputLabel: {
    fontFamily: theme.fontFamily.bodyBold,
    fontSize: 10,
    color: theme.colors.orange,
    letterSpacing: 1.5,
    textTransform: "uppercase",
    marginBottom: theme.spacing.sm,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.sm,
  },
  naira: {
    fontFamily: theme.fontFamily.display,
    fontSize: 32,
    color: theme.colors.orange,
  },
  input: {
    flex: 1,
    fontFamily: theme.fontFamily.display,
    fontSize: 32,
    color: theme.colors.navy,
    paddingVertical: 0,
  },
  hint: {
    fontFamily: theme.fontFamily.body,
    fontSize: 11,
    color: theme.colors.textMuted,
    marginTop: theme.spacing.sm,
  },
  presets: {
    flexDirection: "row",
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.xl,
  },
  presetButton: {
    flex: 1,
    borderRadius: theme.radius.sm,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    paddingVertical: theme.spacing.sm,
    alignItems: "center",
  },
  activePresetButton: {
    borderColor: theme.colors.navy,
    backgroundColor: theme.colors.navy,
  },
  presetLabel: {
    fontFamily: theme.fontFamily.bodyBold,
    fontSize: 11,
    color: theme.colors.textMuted,
  },
  activePresetLabel: {
    color: theme.colors.onDark,
  },
  resultsLabel: {
    fontFamily: theme.fontFamily.bodyBold,
    fontSize: 10,
    color: theme.colors.textMuted,
    letterSpacing: 1.5,
    textTransform: "uppercase",
    marginBottom: theme.spacing.md,
  },
  resultCard: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.md,
  },
  pressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
  resultEmoji: {
    fontSize: 28,
  },
  resultInfo: {
    flex: 1,
  },
  resultName: {
    fontFamily: theme.fontFamily.bodyBold,
    fontSize: 14,
    color: theme.colors.navy,
  },
  resultMeta: {
    fontFamily: theme.fontFamily.body,
    fontSize: 11,
    color: theme.colors.textMuted,
    marginTop: 2,
  },
  resultPriceWrap: {
    alignItems: "flex-end",
  },
  resultPrice: {
    fontFamily: theme.fontFamily.bodyBold,
    fontSize: 14,
    color: theme.colors.green,
  },
  resultDifficulty: {
    fontFamily: theme.fontFamily.body,
    fontSize: 10,
    color: theme.colors.textMuted,
    marginTop: 2,
  },
  generateButton: {
    marginTop: theme.spacing.sm,
    marginBottom: theme.spacing["3xl"],
  },
});
