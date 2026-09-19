import { Dispatch, SetStateAction, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import {
  getClassificationValues,
  RecipeEditorState,
  RecipeEditorValidationError,
  setClassificationValues,
} from "../../../lib/creatorRecipes/editorState";
import { closeSheet, openSheet } from "../../../store/uiStore";
import { theme } from "../../../theme/theme";
import { RecipeAuthoringVocabulary, RecipeSubstitutionInput } from "../../../types/api";
import { AppText } from "../../ui/AppText";
import { Icon } from "../../ui/Icon";
import {
  Card,
  EditorField,
  EditorSection,
  EditorStageIntro,
  EditorTextInput,
  formatVocabularyValues,
  InlineNotice,
  openVocabularyPicker,
  SelectionField,
} from "./EditorCommon";
import { RecipeEditorActionSheet } from "./RecipeEditorActionSheet";

type Props = {
  state: RecipeEditorState;
  setState: Dispatch<SetStateAction<RecipeEditorState>>;
  validationErrors: RecipeEditorValidationError[];
  vocabulary: RecipeAuthoringVocabulary;
  onJumpToStage: (stage: number) => void;
};

export function StageReview({
  state,
  setState,
  validationErrors,
  vocabulary,
  onJumpToStage,
}: Props) {
  const [suggestion, setSuggestion] = useState("");
  const categories = getClassificationValues(state, "category");
  const bases = getClassificationValues(state, "main_ingredient_base");
  const cuisines = getClassificationValues(state, "cuisine");
  const ingredientNames = useMemo(
    () =>
      new Map(
        state.ingredients.map((ingredient) => [
          ingredient.clientId ?? "",
          ingredient.ingredientName ?? "Ingredient",
        ])
      ),
    [state.ingredients]
  );

  function addSuggestion() {
    const label = suggestion.trim();
    if (!label) return;
    setState((current) => ({
      ...current,
      servingSuggestions: [
        ...current.servingSuggestions,
        {
          label,
          relatedRecipeId: null,
          position: current.servingSuggestions.length,
        },
      ],
    }));
    setSuggestion("");
  }

  function addSubstitution() {
    setState((current) => ({
      ...current,
      substitutions: [
        ...current.substitutions,
        {
          sourceIngredientClientId: null,
          sourceIngredientPosition: null,
          replacementIngredientId: null,
          replacementName: null,
          instruction: null,
          position: current.substitutions.length,
        },
      ],
    }));
  }

  function updateSubstitution(
    index: number,
    patch: Partial<RecipeSubstitutionInput>
  ) {
    setState((current) => ({
      ...current,
      substitutions: current.substitutions.map((item, itemIndex) =>
        itemIndex === index ? { ...item, ...patch } : item
      ),
    }));
  }

  function deleteSubstitution(index: number) {
    setState((current) => ({
      ...current,
      substitutions: current.substitutions.filter(
        (_, itemIndex) => itemIndex !== index
      ),
    }));
  }

  function duplicateSubstitution(index: number) {
    setState((current) => {
      const next = [...current.substitutions];
      next.splice(index + 1, 0, { ...current.substitutions[index] });
      return {
        ...current,
        substitutions: next.map((item, position) => ({ ...item, position })),
      };
    });
  }

  function openSubstitutionMenu(index: number) {
    openSheet(
      <RecipeEditorActionSheet
        actions={[
          {
            label: "Duplicate substitution",
            onPress: () => duplicateSubstitution(index),
          },
          {
            label: "Delete substitution",
            danger: true,
            onPress: () => deleteSubstitution(index),
          },
        ]}
      />
    );
  }

  return (
    <>
      <EditorStageIntro eyebrow="Finish" title="Ready it for others">
        Add the details that help people find, serve and store your recipe.
      </EditorStageIntro>

      <EditorSection title="Help people find it" description="Choose the labels that genuinely fit.">
        <View style={styles.pickerList}>
          <SelectionField
            label="Categories"
            values={formatVocabularyValues(categories, vocabulary.categories)}
            placeholder="Choose categories"
            helper="Soup, rice dish, snack and more."
            onPress={() => openVocabularyPicker({
              title: "Choose recipe categories",
              options: vocabulary.categories,
              selected: categories,
              onDone: (values) => setState((current) => setClassificationValues(current, "category", values)),
            })}
          />
          <SelectionField
            label="Main ingredients"
            values={formatVocabularyValues(bases, vocabulary.mainIngredientBases)}
            placeholder="Choose main ingredients"
            helper="The ingredients the dish is built around."
            onPress={() => openVocabularyPicker({
              title: "Choose main ingredient bases",
              options: vocabulary.mainIngredientBases,
              selected: bases,
              showGroups: false,
              onDone: (values) => setState((current) => setClassificationValues(current, "main_ingredient_base", values)),
            })}
          />
          <SelectionField
            label="Cuisine or tribe"
            values={formatVocabularyValues(cuisines, vocabulary.cuisines)}
            placeholder="Choose cuisine or tribe"
            helper="The food tradition this recipe belongs to."
            onPress={() => openVocabularyPicker({
              title: "Choose cuisine or tribe",
              options: vocabulary.cuisines,
              selected: cuisines,
              groupSeparator: " > ",
              onDone: (values) => setState((current) => setClassificationValues(current, "cuisine", values)),
            })}
          />
        </View>
      </EditorSection>

      <View style={styles.serveSection}>
        <AppText style={styles.sectionTitle}>Serve it well</AppText>
        <AppText style={styles.sectionDescription}>These details are optional, but useful.</AppText>

      <View style={styles.sectionBlock}>
        <View style={styles.labelRow}><AppText style={styles.sectionLabel}>Best served with</AppText><AppText style={styles.fieldMeta}>Optional</AppText></View>
        {state.servingSuggestions.length ? (
          <View style={styles.suggestionChips}>
            {state.servingSuggestions.map((item, index) => (
              <Pressable
                key={`${item.label}-${index}`}
                accessibilityLabel={`Remove ${item.label}`}
                onPress={() =>
                  setState((current) => ({
                    ...current,
                    servingSuggestions: current.servingSuggestions.filter(
                      (_, itemIndex) => itemIndex !== index
                    ),
                  }))
                }
                style={styles.suggestionChip}
              >
                <AppText style={styles.suggestionText}>{item.label}</AppText>
                <Icon name="close" size={12} color={theme.colors.navy3} />
              </Pressable>
            ))}
          </View>
        ) : null}
        <View style={styles.addRow}>
          <View style={styles.addInput}>
            <EditorTextInput
              value={suggestion}
              onChangeText={setSuggestion}
              onSubmitEditing={addSuggestion}
              returnKeyType="done"
              maxLength={220}
              placeholder="Add a food or drink, then press Enter"
            />
          </View>
        </View>
      </View>

      <View style={styles.sectionBlock}>
        <View style={styles.labelRow}><AppText style={styles.sectionLabel}>Ingredient substitutions</AppText><AppText style={styles.fieldMeta}>Optional</AppText></View>
        {state.substitutions.map((substitution, index) => (
          <Card key={`substitution-${index}`} style={styles.substitutionCard}>
            <View style={styles.substitutionHeader}>
              <AppText style={styles.substitutionTitle}>
                Substitution {index + 1}
              </AppText>
              <Pressable
                accessibilityLabel={`More options for substitution ${index + 1}`}
                onPress={() => openSubstitutionMenu(index)}
                hitSlop={8}
              >
                <Icon name="moreH" size={15} color={theme.colors.textMuted} />
              </Pressable>
            </View>

            <Pressable
              onPress={() =>
                openSourceIngredientPicker({
                  ingredients: state.ingredients,
                  selected:
                    substitution.sourceIngredientClientId ??
                    state.ingredients.find(
                      (ingredient) =>
                        ingredient.position === substitution.sourceIngredientPosition
                    )?.clientId ??
                    null,
                  onDone: (clientId) =>
                    updateSubstitution(index, {
                      sourceIngredientClientId: clientId,
                      sourceIngredientPosition: null,
                    }),
                })
              }
              style={styles.substitutionInput}
            >
              <AppText
                style={
                  substitution.sourceIngredientClientId ||
                  substitution.sourceIngredientPosition !== null &&
                    substitution.sourceIngredientPosition !== undefined
                    ? styles.selectValue
                    : styles.selectPlaceholder
                }
              >
                {substitution.sourceIngredientClientId ||
                substitution.sourceIngredientPosition !== null &&
                  substitution.sourceIngredientPosition !== undefined
                  ? ingredientNames.get(
                      substitution.sourceIngredientClientId ??
                        state.ingredients.find(
                          (ingredient) =>
                            ingredient.position ===
                            substitution.sourceIngredientPosition
                        )?.clientId ??
                        ""
                    ) ?? "Ingredient"
                  : "Choose an ingredient from this recipe"}
              </AppText>
              <Icon name="chevronDown" size={14} color={theme.colors.textMuted} />
            </Pressable>

            <EditorTextInput
              value={substitution.replacementName ?? ""}
              onChangeText={(replacementName) =>
                updateSubstitution(index, {
                  replacementName,
                  replacementIngredientId: null,
                })
              }
              maxLength={200}
              placeholder="Search ingredients"
              style={styles.substitutionTextInput}
            />

            <EditorTextInput
              value={substitution.instruction ?? ""}
              onChangeText={(instruction) =>
                updateSubstitution(index, { instruction })
              }
              maxLength={2000}
              placeholder="e.g. Reduce the cooking time so it does not dry out."
              style={styles.substitutionTextInput}
            />

            {substitution.sourceIngredientClientId && substitution.replacementName ? (
              <AppText style={styles.substitutionPreview}>
                How it will appear: Replace {ingredientNames.get(substitution.sourceIngredientClientId) ?? "ingredient"} with {substitution.replacementName}. {substitution.instruction ?? ""}
              </AppText>
            ) : null}
          </Card>
        ))}
        <Pressable
          disabled={!state.ingredients.length}
          onPress={addSubstitution}
          style={[styles.addSubstitution, !state.ingredients.length && styles.disabled]}
        >
          <AppText style={styles.addSubstitutionText}>+ Add substitution</AppText>
        </Pressable>
        {!state.ingredients.length ? (
          <InlineNotice tone="warning">
            Add ingredients in stage three before creating substitutions.
          </InlineNotice>
        ) : null}
      </View>

      <EditorField
        label="Storage instructions"
        required
        helper="If it does not store well, say that it is best eaten fresh."
      >
        <EditorTextInput
          value={state.storageInstructions ?? ""}
          onChangeText={(storageInstructions) =>
            setState((current) => ({ ...current, storageInstructions }))
          }
          maxLength={3000}
          multiline
          placeholder="Store in an airtight container in the fridge for up to 3 days."
          style={styles.storageInput}
        />
      </EditorField>
      </View>

      <View style={styles.reviewSection}>
        <AppText style={styles.reviewTitle}>Publication check</AppText>
        <AppText style={styles.reviewCopy}>
          Review anything that still needs attention.
        </AppText>
        {validationErrors.length ? (
          <View style={styles.errorsCard}>
            <AppText style={styles.errorsTitle}>
              Finish {validationErrors.length} item
              {validationErrors.length === 1 ? "" : "s"} before publishing
            </AppText>
            <AppText style={styles.errorsCopy}>Tap an item to return to that step.</AppText>
          </View>
        ) : (
          <View style={styles.readyCard}>
            <AppText style={styles.readyTitle}>Ready to publish</AppText>
            <AppText style={styles.readyCopy}>
              All required information has been added.
            </AppText>
          </View>
        )}
        {validationErrors.length ? (
          <View style={styles.fixLinks}>
            {[...new Set(validationErrors.map((error) => error.stage))].map(
              (errorStage) => (
                <Pressable
                  key={errorStage}
                  onPress={() => onJumpToStage(errorStage)}
                  style={styles.fixRow}
                >
                  <AppText style={styles.fixStage}>
                    {[
                      "",
                      "Start",
                      "Details",
                      "Ingredients",
                      "Method",
                      "Finish",
                    ][errorStage]}
                  </AppText>
                  <View style={styles.fixAction}><AppText style={styles.fixText}>Review</AppText><Icon name="chevronRight" size={15} color={theme.colors.textMuted} /></View>
                </Pressable>
              )
            )}
          </View>
        ) : null}
      </View>
    </>
  );
}

function openSourceIngredientPicker({
  ingredients,
  selected,
  onDone,
}: {
  ingredients: RecipeEditorState["ingredients"];
  selected: string | null;
  onDone: (clientId: string) => void;
}) {
  openSheet(
    <View style={styles.sheet}>
      <AppText style={styles.sheetTitle}>Choose ingredient</AppText>
      <ScrollView style={styles.sheetList}>
        {ingredients.map((ingredient) => (
          <Pressable
            key={ingredient.clientId}
            onPress={() => {
              onDone(ingredient.clientId ?? "");
              closeSheet();
            }}
            style={styles.sheetOption}
          >
            <AppText style={styles.sheetOptionTitle}>
              {ingredient.ingredientName ?? "Ingredient"}
            </AppText>
            {selected === ingredient.clientId ? (
              <Icon name="check" size={17} color={theme.colors.green} />
            ) : null}
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  pickerList: { overflow: "hidden", borderWidth: 1, borderColor: "#D9D9D9", borderRadius: 16, backgroundColor: "#FFFFFF" },
  serveSection: { marginBottom: 26, paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: "#D9D9D9" },
  sectionTitle: { fontFamily: theme.fontFamily.displaySemiBold, fontSize: 19, color: theme.colors.navy },
  sectionDescription: { marginTop: 5, marginBottom: 18, fontSize: 12.5, lineHeight: 18, color: theme.colors.textMuted },
  sectionBlock: { marginBottom: 18 },
  labelRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
  fieldMeta: { fontSize: 11, color: theme.colors.textMuted },
  sectionLabel: { fontFamily: theme.fontFamily.body, fontSize: 13, color: theme.colors.text },
  sectionHelper: { marginTop: 4, marginBottom: 10, fontSize: 11.5, lineHeight: 16, color: theme.colors.textMuted },
  suggestionChips: { flexDirection: "row", flexWrap: "wrap", gap: 7 },
  suggestionChip: { paddingHorizontal: 10, paddingVertical: 7, flexDirection: "row", alignItems: "center", gap: 5, borderRadius: 999, backgroundColor: theme.colors.surface2 },
  suggestionText: { fontSize: 11, color: theme.colors.navy3 },
  addRow: { marginTop: 8 },
  addInput: { flex: 1 },
  disabled: { opacity: 0.35 },
  addSubstitution: { minHeight: 42, alignItems: "center", justifyContent: "center", borderWidth: 1, borderStyle: "dashed", borderColor: theme.colors.border, borderRadius: 12, backgroundColor: theme.colors.white },
  addSubstitutionText: { fontFamily: theme.fontFamily.bodyMedium, fontSize: 12.5, color: theme.colors.navy3 },
  substitutionCard: { padding: 14, gap: 8 },
  substitutionHeader: { marginBottom: 0, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  substitutionTitle: { flex: 1, fontFamily: theme.fontFamily.body, fontSize: 12.5, color: theme.colors.textMuted },
  substitutionInput: { minHeight: 42, paddingHorizontal: 12, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8, borderWidth: 1, borderColor: theme.colors.border, borderRadius: 10, backgroundColor: theme.colors.surface2 },
  substitutionTextInput: { minHeight: 42, paddingHorizontal: 12, borderWidth: 1, borderRadius: 10, backgroundColor: theme.colors.surface2, fontSize: 13.5 },
  substitutionPreview: { fontSize: 12, lineHeight: 17, color: theme.colors.textMuted },
  selectValue: { flex: 1, fontSize: 13, color: theme.colors.text },
  selectPlaceholder: { flex: 1, fontSize: 13, color: theme.colors.textMuted },
  storageInput: { minHeight: 96 },
  reviewSection: { paddingTop: 15, marginBottom: 12, borderTopWidth: 1, borderTopColor: theme.colors.border },
  reviewTitle: { fontFamily: theme.fontFamily.display, fontSize: 18, color: theme.colors.navy },
  reviewCopy: { marginTop: 4, marginBottom: 12, fontSize: 12.5, lineHeight: 18, color: theme.colors.textMedium },
  errorsCard: { padding: 14, borderWidth: 1, borderColor: "#E8C4BE", borderRadius: 14, backgroundColor: "#FBF0EE" },
  errorsTitle: { marginBottom: 7, fontFamily: theme.fontFamily.bodyBold, fontSize: 13.5, color: theme.colors.red },
  errorsCopy: { fontSize: 12, lineHeight: 17, color: theme.colors.red },
  errorText: { paddingVertical: 6, fontSize: 13, lineHeight: 18, color: theme.colors.red, textDecorationLine: "underline" },
  fixLinks: { marginTop: 0 },
  fixRow: { minHeight: 42, flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  fixStage: { fontSize: 13.5, color: theme.colors.text },
  fixText: { fontFamily: theme.fontFamily.bodySemiBold, fontSize: 13, color: theme.colors.navy3 },
  fixAction: { flexDirection: "row", alignItems: "center", gap: 6 },
  readyCard: { padding: 14, borderWidth: 1, borderColor: "#B7D6C3", borderRadius: 14, backgroundColor: "#F0F8F2" },
  readyTitle: { fontFamily: theme.fontFamily.bodyBold, fontSize: 13.5, color: theme.colors.navy3 },
  readyCopy: { marginTop: 4, fontSize: 11.5, lineHeight: 17, color: theme.colors.textMedium },
  sheet: { paddingBottom: 24, gap: 12 },
  sheetTitle: { fontFamily: theme.fontFamily.display, fontSize: 22, color: theme.colors.navy },
  sheetList: { maxHeight: 400 },
  sheetOption: { minHeight: 54, flexDirection: "row", alignItems: "center", gap: 10, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  sheetOptionTitle: { fontFamily: theme.fontFamily.bodyMedium, fontSize: 13.5 },
});
