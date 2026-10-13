import { Dispatch, SetStateAction } from "react";
import { Pressable, StyleSheet, TextInput, View } from "react-native";
import { getAffordabilitySuggestion, getClassificationValues, RecipeEditorState, setClassificationValues } from "../../../lib/creatorRecipes/editorState";
import { openSheet } from "../../../store/uiStore";
import { theme } from "../../../theme/theme";
import { RecipeAuthoringVocabulary } from "../../../types/api";
import { AppText } from "../../ui/AppText";
import { Icon } from "../../ui/Icon";
import { ChoiceRow, EditorSection, EditorStageIntro, formatVocabularyValues, openVocabularyPicker, SelectionField } from "./EditorCommon";
import { RecipeComparisonBasisSheet } from "./RecipeComparisonBasisSheet";

type Props = { state: RecipeEditorState; setState: Dispatch<SetStateAction<RecipeEditorState>>; vocabulary: RecipeAuthoringVocabulary };

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

  return <>
    <EditorStageIntro eyebrow="Details" title="Set the essentials">
      Help cooks understand the time, effort and cost before they begin.
    </EditorStageIntro>

    <EditorSection title="When it fits" description="Choose every occasion that makes sense.">
      <View style={styles.pickerList}><SelectionField
        last
        label="Occasions" required values={formatVocabularyValues(occasions, vocabulary.occasions)}
        placeholder="Choose occasions" helper="Breakfast, weeknight dinner, a party or something else."
        onPress={() => openVocabularyPicker({ title: "Choose occasions", options: vocabulary.occasions, selected: occasions,
          onDone: (values) => setState((current) => setClassificationValues(current, "occasion", values)) })}
      /></View>
    </EditorSection>

    <EditorSection title="Effort and time" description="Keep the estimate realistic for a first-time cook.">
      <ChoiceRow options={[...DIFFICULTIES]} value={state.difficulty}
        onChange={(difficulty) => setState((current) => ({ ...current, difficulty }))} />
      <View style={styles.metrics}>
        <View style={styles.servingRow}>
          <View style={styles.servingCopy}>
            <AppText style={styles.metricLabel}>Serves</AppText>
            <AppText style={styles.servingValue}>{state.baseServings ?? 1}</AppText>
            <AppText style={styles.people}>people</AppText>
          </View>
          <View style={styles.stepper}>
            <Pressable accessibilityLabel="Decrease servings" disabled={(state.baseServings ?? 1) <= 1}
              onPress={() => setState((current) => ({ ...current, baseServings: Math.max(1, (current.baseServings ?? 1) - 1) }))}
              style={({ pressed }) => [styles.stepButton, pressed && styles.pressed]}>
              <Icon name="minus" size={17} color={theme.colors.text} />
            </Pressable>
            <Pressable accessibilityLabel="Increase servings" disabled={(state.baseServings ?? 1) >= 25}
              onPress={() => setState((current) => ({ ...current, baseServings: Math.min(25, (current.baseServings ?? 1) + 1) }))}
              style={({ pressed }) => [styles.stepButton, pressed && styles.pressed]}>
              <Icon name="plus" size={17} color={theme.colors.text} />
            </Pressable>
          </View>
        </View>
        <View style={styles.timeGrid}>
          <TimeInput label="Preparation" value={state.prepTimeMinutes}
            onChange={(prepTimeMinutes) => setState((current) => ({ ...current, prepTimeMinutes }))} />
          <TimeInput label="Cooking" value={state.cookTimeMinutes}
            onChange={(cookTimeMinutes) => setState((current) => ({ ...current, cookTimeMinutes }))} divided />
        </View>
      </View>
    </EditorSection>

    <EditorSection title="How it is cooked" description="Select every method used in the recipe.">
      <View style={styles.pickerList}><SelectionField
        last
        label="Cooking methods" required values={formatVocabularyValues(methods, vocabulary.cookingMethods)}
        placeholder="Choose cooking methods" helper="Fried, boiled, grilled, baked and more."
        onPress={() => openVocabularyPicker({ title: "Choose cooking methods", options: vocabulary.cookingMethods, selected: methods,
          onDone: (values) => setState((current) => setClassificationValues(current, "cooking_method", values)) })}
      /></View>
    </EditorSection>

    <View style={styles.costSection}>
      <AppText style={styles.sectionTitle}>Cost guide</AppText>
      <AppText style={styles.sectionDescription}>Estimate the full recipe, not one serving.</AppText>
      <View style={styles.costInputWrap}>
        <AppText style={styles.currency}>₦</AppText>
        <TextInput value={state.estimatedCost === null ? "" : String(state.estimatedCost)}
          onChangeText={(value) => { const digits = value.replace(/[^0-9]/g, ""); setState((current) => ({ ...current, estimatedCost: digits ? Number(digits) : null })); }}
          keyboardType="number-pad" placeholder="0" placeholderTextColor={theme.colors.textMuted} style={styles.costInput} />
      </View>
      <AppText style={styles.costNote}>{suggestion
        ? `About ₦${suggestion.perServing.toLocaleString("en-NG")} per serving. Suggested: ${formatBand(suggestion.band)}`
        : "Add the total cost to see a per-serving estimate."}</AppText>
      <Pressable onPress={() => openSheet(<RecipeComparisonBasisSheet value={state.affordabilityBasis ?? "meal"}
        onApply={(affordabilityBasis) => setState((current) => ({ ...current, affordabilityBasis, affordabilityBand: null }))} />)}
        style={styles.inlineAction}>
        <AppText style={styles.comparisonLink}>Change comparison basis</AppText>
      </Pressable>
      <ChoiceRow options={[...AFFORDABILITY]} value={state.affordabilityBand}
        onChange={(affordabilityBand) => setState((current) => ({ ...current, affordabilityBand }))} />
    </View>
  </>;
}

function TimeInput({ label, value, onChange, divided }: { label: string; value: number | null; onChange: (value: number | null) => void; divided?: boolean }) {
  return <View style={[styles.timeCell, divided && styles.timeCellDivided]}>
    <AppText style={styles.timeLabel}>{label}</AppText>
    <View style={styles.timeValueRow}>
      <TextInput value={value === null ? "" : String(value)} onChangeText={(text) => { const digits = text.replace(/[^0-9]/g, ""); onChange(digits ? Number(digits) : null); }}
        keyboardType="number-pad" placeholder="0" placeholderTextColor={theme.colors.textMuted} style={styles.timeInput} />
      <AppText style={styles.timeSuffix}>min</AppText>
    </View>
  </View>;
}

function formatBand(value: "low" | "moderate" | "expensive") {
  if (value === "low") return "Low budget";
  if (value === "moderate") return "Moderate budget";
  return "Expensive";
}

const styles = StyleSheet.create({
  pickerList: { overflow: "hidden", borderWidth: 1, borderColor: "#D9D9D9", borderRadius: 16, backgroundColor: "#FFFFFF" },
  metrics: { overflow: "hidden", borderWidth: 1, borderColor: "#D9D9D9", borderRadius: 18, backgroundColor: "#FFFFFF" },
  servingRow: { paddingHorizontal: 16, paddingVertical: 17, flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderBottomWidth: 1, borderBottomColor: "#D9D9D9" },
  servingCopy: { flexDirection: "row", alignItems: "baseline", gap: 7 },
  metricLabel: { fontSize: 13, color: theme.colors.textMuted },
  servingValue: { fontFamily: theme.fontFamily.display, fontSize: 27, color: theme.colors.navy },
  people: { fontSize: 13, color: theme.colors.textMuted },
  stepper: { flexDirection: "row", gap: 8 },
  stepButton: { width: 42, height: 42, alignItems: "center", justifyContent: "center", borderRadius: 21, backgroundColor: "#F2F2F2" },
  timeGrid: { flexDirection: "row" },
  timeCell: { flex: 1, paddingHorizontal: 16, paddingVertical: 15 },
  timeCellDivided: { borderLeftWidth: 1, borderLeftColor: "#D9D9D9" },
  timeLabel: { fontSize: 12, color: theme.colors.textMuted },
  timeValueRow: { marginTop: 4, flexDirection: "row", alignItems: "baseline", gap: 5 },
  timeInput: { minWidth: 36, padding: 0, fontFamily: theme.fontFamily.display, fontSize: 20, color: theme.colors.text },
  timeSuffix: { fontSize: 12, color: theme.colors.textMuted },
  costSection: { marginBottom: 30, padding: 18, borderRadius: 18, backgroundColor: "#F2F2F2" },
  sectionTitle: { fontFamily: theme.fontFamily.display, fontSize: 18, letterSpacing: -0.32, color: theme.colors.navy },
  sectionDescription: { marginTop: 5, fontSize: 12.5, lineHeight: 18, color: theme.colors.textMuted },
  costInputWrap: { minHeight: 52, marginTop: 15, paddingHorizontal: 14, flexDirection: "row", alignItems: "center", gap: 7, borderWidth: 1, borderColor: "#D9D9D9", borderRadius: 14, backgroundColor: "#FFFFFF" },
  currency: { fontFamily: theme.fontFamily.body, fontSize: 14.5, color: theme.colors.textMuted },
  costInput: { flex: 1, paddingVertical: 0, fontFamily: theme.fontFamily.body, fontSize: 14.5, color: theme.colors.text },
  costNote: { marginTop: 10, fontSize: 12, lineHeight: 17, color: theme.colors.textMuted },
  inlineAction: { alignSelf: "flex-start", paddingVertical: 8 },
  comparisonLink: { fontFamily: theme.fontFamily.bodySemiBold, fontSize: 12, color: theme.colors.navy3 },
  pressed: { opacity: 0.82 },
});
