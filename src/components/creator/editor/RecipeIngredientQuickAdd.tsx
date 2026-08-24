import { useMemo, useState } from "react";
import { Pressable, StyleSheet, TextInput, View } from "react-native";
import { createLocalId } from "../../../lib/id";
import { theme } from "../../../theme/theme";
import type { Ingredient, RecipeIngredientInput, Unit } from "../../../types/api";
import { AppText } from "../../ui/AppText";

type NewIngredient = Omit<
  RecipeIngredientInput,
  "position" | "sectionPosition"
>;

export function RecipeIngredientQuickAdd({
  catalog,
  units,
  onAdd,
  onUseCustom,
}: {
  catalog: Ingredient[];
  units: Unit[];
  onAdd: (ingredient: NewIngredient) => void;
  onUseCustom: () => void;
}) {
  const [query, setQuery] = useState("");
  const [focused, setFocused] = useState(false);
  const ingredientQuery = normalizeIngredientQuery(query, units);
  const matches = useMemo(() => {
    if (!ingredientQuery) return [];
    return catalog
      .filter((ingredient) =>
        [
          ingredient.displayName,
          ingredient.canonicalName,
          ...ingredient.aliases,
          ...ingredient.searchTerms,
          ...ingredient.localNames.map((name) => name.name),
        ].some((value) => value.toLowerCase().includes(ingredientQuery))
      )
      .slice(0, 5);
  }, [catalog, ingredientQuery]);

  function choose(ingredient: Ingredient) {
    const quantity = query.trim().match(/^(\d+(?:\.\d+)?)/)?.[1] ?? null;
    const normalizedQuery = query.toLowerCase();
    const unit = units.find(
      (candidate) =>
        normalizedQuery.includes(candidate.name.toLowerCase()) ||
        normalizedQuery.includes(candidate.id.toLowerCase())
    );
    onAdd({
      clientId: createLocalId("ingredient"),
      rawText: query.trim() || ingredient.displayName,
      ingredientName: ingredient.displayName,
      ingredientId: ingredient.id,
      quantity,
      quantityMax: null,
      quantityMode: "exact",
      unit: unit?.id ?? null,
      preparationNote: null,
      sizeNote: null,
      customMeasurementBasis: null,
      isCustom: false,
      isOptional: false,
    });
    setQuery("");
    setFocused(false);
  }

  return (
    <View style={styles.wrap}>
      <TextInput
        value={query}
        onChangeText={setQuery}
        onFocus={() => setFocused(true)}
        onBlur={() => {
          setTimeout(() => setFocused(false), 120);
        }}
        autoCapitalize="none"
        autoCorrect={false}
        placeholder="e.g. 2 cups flour"
        placeholderTextColor="#9AA298"
        style={styles.input}
      />
      {focused && query.trim() ? (
        <View accessibilityRole="list" style={styles.suggestions}>
          {matches.map((ingredient) => (
            <Pressable
              key={ingredient.id}
              onPress={() => choose(ingredient)}
              style={styles.suggestion}
            >
              <AppText style={styles.suggestionText}>
                {ingredient.displayName}
              </AppText>
            </Pressable>
          ))}
          <Pressable onPress={onUseCustom} style={styles.suggestion}>
            <AppText style={styles.customText}>
              Add “{ingredientQuery || query.trim()}” as new ingredient
            </AppText>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

function normalizeIngredientQuery(value: string, units: Unit[]) {
  let normalized = value.trim().toLowerCase().replace(/^\d+(?:\.\d+)?\s*/, "");
  const unitNames = units
    .flatMap((unit) => [unit.id, unit.name])
    .sort((left, right) => right.length - left.length);
  for (const unitName of unitNames) {
    const escaped = unitName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    normalized = normalized.replace(new RegExp(`^${escaped}s?\\s+`, "i"), "");
  }
  return normalized.trim();
}

const styles = StyleSheet.create({
  wrap: { position: "relative", zIndex: 2 },
  input: { minHeight: 46, paddingHorizontal: 13, borderWidth: 1.5, borderStyle: "dashed", borderColor: theme.colors.border, borderRadius: 12, backgroundColor: theme.colors.surface2, fontFamily: theme.fontFamily.body, fontSize: 13.5, color: theme.colors.text },
  suggestions: { marginTop: 4, overflow: "hidden", borderWidth: 1, borderColor: theme.colors.border, borderRadius: 12, backgroundColor: theme.colors.white },
  suggestion: { minHeight: 46, paddingHorizontal: 13, justifyContent: "center", borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  suggestionText: { fontFamily: theme.fontFamily.bodyMedium, fontSize: 13, color: theme.colors.text },
  customText: { fontSize: 12.5, color: theme.colors.navy3 },
});
