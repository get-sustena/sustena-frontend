import { Dispatch, SetStateAction } from "react";
import { Pressable, StyleSheet, TextInput, View } from "react-native";
import {
  getAffordabilitySuggestion,
  getClassificationValues,
  RecipeEditorState,
  setClassificationValues,
} from "../../../lib/creatorRecipes/editorState";
import { openSheet } from "../../../store/uiStore";
import { theme } from "../../../theme/theme";
import { RecipeAuthoringVocabulary } from "../../../types/api";
import { AppText } from "../../ui/AppText";
import { Icon } from "../../ui/Icon";
import {
  ChoiceRow,
  EditorField,
  EditorGroupCard,
  EditorGroupLabel,
  EditorNumberInput,
  formatVocabularyValues,
  openVocabularyPicker,
  SelectionField,
  StageRequirementNote,
} from "./EditorCommon";
import { RecipeComparisonBasisSheet } from "./RecipeComparisonBasisSheet";

type Props = {
  state: RecipeEditorState;
  setState: Dispatch<SetStateAction<RecipeEditorState>>;
  vocabulary: RecipeAuthoringVocabulary;
};

const DIFFICULTIES = [
  { value: "easy", label: "Easy" },
  { value: "medium", label: "Medium" },
  { value: "hard", label: "Hard" },
] as const;

const AFFORDABILITY = [
  { value: "low", label: "Low budget" },
  { value: "moderate", label: "Moderate budget" },
  { value: "expensive", label: "Expensive" },
] as const;

export function StageDetails({ state, setState, vocabulary }: Props) {
  const occasions = getClassificationValues(state, "occasion");
  const methods = getClassificationValues(state, "cooking_method");
  const suggestion = getAffordabilitySuggestion(state);

  return (
    <>
      <StageRequirementNote />

      <EditorGroupLabel>Occasions</EditorGroupLabel>
      <EditorGroupCard>
        <SelectionField
          label="Occasions"
          required
          values={formatVocabularyValues(occasions, vocabulary.occasions)}
          placeholder="Choose occasions"
          helper="When would someone cook this: breakfast, a party, an everyday dinner?"
          onPress={() =>
            openVocabularyPicker({
              title: "Choose occasions",
              options: vocabulary.occasions,
              selected: occasions,
              onDone: (values) =>
                setState((current) =>
                  setClassificationValues(current, "occasion", values)
                ),
            })
          }
        />
      </EditorGroupCard>

      <EditorField
        label="Difficulty"
        required
        helper="Choose the skill level a cook needs."
      >
        <ChoiceRow
          options={[...DIFFICULTIES]}
          value={state.difficulty}
          onChange={(difficulty) =>
            setState((current) => ({ ...current, difficulty }))
          }
        />
      </EditorField>

      <View style={styles.twoColumns}>
        <View style={styles.column}>
          <EditorField label="Preparation" required>
            <EditorNumberInput
              value={state.prepTimeMinutes}
              suffix="min"
              onChange={(prepTimeMinutes) =>
                setState((current) => ({ ...current, prepTimeMinutes }))
              }
            />
          </EditorField>
        </View>
        <View style={styles.column}>
          <EditorField label="Cooking" required>
            <EditorNumberInput
              value={state.cookTimeMinutes}
              suffix="min"
              onChange={(cookTimeMinutes) =>
                setState((current) => ({ ...current, cookTimeMinutes }))
              }
            />
          </EditorField>
        </View>
      </View>
      <AppText style={styles.timeHelper}>Enter 0 if no time is needed.</AppText>

      <EditorField
        label="Number of servings"
        required
        helper="Enter how many people this recipe serves."
      >
        <View style={styles.servings}>
          <Pressable
            accessibilityLabel="Decrease servings"
            disabled={(state.baseServings ?? 1) <= 1}
            onPress={() =>
              setState((current) => ({
                ...current,
                baseServings: Math.max(1, (current.baseServings ?? 1) - 1),
              }))
            }
            style={styles.servingButton}
          >
            <Icon name="minus" size={17} color={theme.colors.text} />
          </Pressable>
          <AppText style={styles.servingValue}>{state.baseServings ?? 1}</AppText>
          <Pressable
            accessibilityLabel="Increase servings"
            disabled={(state.baseServings ?? 1) >= 25}
            onPress={() =>
              setState((current) => ({
                ...current,
                baseServings: Math.min(25, (current.baseServings ?? 1) + 1),
              }))
            }
            style={styles.servingButton}
          >
            <Icon name="plus" size={17} color={theme.colors.text} />
          </Pressable>
        </View>
      </EditorField>

      <EditorGroupLabel>Cooking methods</EditorGroupLabel>
      <EditorGroupCard>
        <SelectionField
          label="Cooking methods"
          required
          values={formatVocabularyValues(methods, vocabulary.cookingMethods)}
          placeholder="Choose cooking methods"
          helper="How it’s cooked: fried, boiled, grilled, baked."
          onPress={() =>
            openVocabularyPicker({
              title: "Choose cooking methods",
              options: vocabulary.cookingMethods,
              selected: methods,
              onDone: (values) =>
                setState((current) =>
                  setClassificationValues(current, "cooking_method", values)
                ),
            })
          }
        />
      </EditorGroupCard>

      <EditorField
        label="Estimated total cost"
        required
        helper="Enter the estimated cost for the whole recipe."
      >
        <View style={styles.costBox}>
          <AppText style={styles.currency}>₦</AppText>
          <TextInput
            value={state.estimatedCost === null ? "" : String(state.estimatedCost)}
            onChangeText={(value) => {
              const digits = value.replace(/[^0-9]/g, "");
              setState((current) => ({
                ...current,
                estimatedCost: digits ? Number(digits) : null,
              }));
            }}
            keyboardType="number-pad"
            placeholder="0"
            placeholderTextColor={theme.colors.textMuted}
            style={styles.costInput}
          />
        </View>
      </EditorField>

      <EditorField
        label="Affordability per serving"
        required
        helper="Confirm the affordability per serving."
      >
        <AppText style={styles.affordabilitySuggestion}>
          {suggestion
            ? `About ₦${suggestion.perServing.toLocaleString("en-NG")} per serving · Suggested: ${formatBand(suggestion.band)}`
            : "Add the estimated total cost and number of servings to see a suggestion."}
        </AppText>
        <Pressable
          onPress={() =>
            openSheet(
              <RecipeComparisonBasisSheet
                value={state.affordabilityBasis ?? "meal"}
                onApply={(affordabilityBasis) =>
                  setState((current) => ({
                    ...current,
                    affordabilityBasis,
                    affordabilityBand: null,
                  }))
                }
              />
            )
          }
        >
          <AppText style={styles.comparisonLink}>Change comparison basis</AppText>
        </Pressable>
        <ChoiceRow
          options={[...AFFORDABILITY]}
          value={state.affordabilityBand}
          onChange={(affordabilityBand) =>
            setState((current) => ({ ...current, affordabilityBand }))
          }
        />
      </EditorField>
    </>
  );
}

function formatBand(value: "low" | "moderate" | "expensive") {
  if (value === "low") return "Low budget";
  if (value === "moderate") return "Moderate budget";
  return "Expensive";
}

const styles = StyleSheet.create({
  twoColumns: { flexDirection: "row", gap: 12 },
  column: { flex: 1 },
  timeHelper: { marginTop: -11, marginBottom: 17, fontSize: 12, color: theme.colors.textMuted },
  servings: {
    minHeight: 58,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 14,
    backgroundColor: theme.colors.white,
  },
  servingButton: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 11,
    backgroundColor: theme.colors.surface2,
  },
  servingValue: {
    fontFamily: theme.fontFamily.display,
    fontSize: 24,
    color: theme.colors.navy,
  },
  costBox: { minHeight: 52, paddingHorizontal: 14, flexDirection: "row", alignItems: "center", gap: 7, borderWidth: 1.5, borderColor: theme.colors.border, borderRadius: 14, backgroundColor: theme.colors.white },
  currency: { fontFamily: theme.fontFamily.body, fontSize: 14.5, color: theme.colors.textMuted },
  costInput: { flex: 1, paddingVertical: 0, fontFamily: theme.fontFamily.body, fontSize: 14, color: theme.colors.text },
  affordabilitySuggestion: { marginBottom: 5, fontSize: 12, lineHeight: 17, color: theme.colors.textMuted },
  comparisonLink: { marginBottom: 9, fontFamily: theme.fontFamily.bodySemiBold, fontSize: 12, color: theme.colors.navy3 },
});
