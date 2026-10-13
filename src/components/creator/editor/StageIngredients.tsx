import { Href, router } from "expo-router";
import { Dispatch, SetStateAction, useMemo, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import { createLocalId } from "../../../lib/id";
import { RecipeEditorState } from "../../../lib/creatorRecipes/editorState";
import { formatQuantityText } from "../../../lib/scaling";
import { closeSheet, openSheet } from "../../../store/uiStore";
import { setRecipeUnitPicker } from "../../../store/recipeUnitPickerStore";
import { usePreferencesStore } from "../../../store/preferencesStore";
import { theme } from "../../../theme/theme";
import {
  Ingredient,
  RecipeIngredientInput,
  Unit,
} from "../../../types/api";
import { AppText } from "../../ui/AppText";
import { Button } from "../../ui/Button";
import { Icon } from "../../ui/Icon";
import {
  Card,
  ChoiceRow,
  EditorField,
  EditorStageIntro,
  EditorTextInput,
} from "./EditorCommon";
import { RecipeIngredientQuickAdd } from "./RecipeIngredientQuickAdd";
import { RecipeEditorActionSheet } from "./RecipeEditorActionSheet";

type Props = {
  state: RecipeEditorState;
  setState: Dispatch<SetStateAction<RecipeEditorState>>;
  ingredientCatalog: Ingredient[];
  units: Unit[];
};

const QUANTITY_MODES = [
  { value: "exact", label: "Exact" },
  { value: "range", label: "Range" },
  { value: "to_taste", label: "To taste" },
  { value: "as_needed", label: "As needed" },
] as const;

const CUSTOM_BASES = [
  { value: "mass", label: "Mass" },
  { value: "liquid", label: "Liquid" },
  { value: "item", label: "Items" },
  { value: "bunch", label: "Bunches" },
] as const;

export function StageIngredients({
  state,
  setState,
  ingredientCatalog,
  units,
}: Props) {
  const [openIngredientId, setOpenIngredientId] = useState<string | null>(null);
  const defaultUnitMode = usePreferencesStore((current) => current.defaultUnitMode);
  const catalogueById = useMemo(
    () => new Map(ingredientCatalog.map((ingredient) => [ingredient.id, ingredient])),
    [ingredientCatalog]
  );

  function addIngredient(
    sectionPosition: number,
    ingredient: Omit<RecipeIngredientInput, "position" | "sectionPosition">
  ) {
    setOpenIngredientId(ingredient.clientId ?? null);
    setState((current) => ({
      ...current,
      ingredients: [
        ...current.ingredients,
        {
          ...ingredient,
          sectionPosition,
          position: current.ingredients.length,
        },
      ],
    }));
  }

  function updateIngredient(
    clientId: string,
    patch: Partial<RecipeIngredientInput>
  ) {
    setState((current) => ({
      ...current,
      ingredients: current.ingredients.map((ingredient) =>
        ingredient.clientId === clientId
          ? { ...ingredient, ...patch }
          : ingredient
      ),
    }));
  }

  function removeIngredient(clientId: string) {
    setOpenIngredientId((current) => (current === clientId ? null : current));
    setState((current) => ({
      ...current,
      ingredients: current.ingredients.filter(
        (ingredient) => ingredient.clientId !== clientId
      ),
      substitutions: current.substitutions.filter(
        (substitution) => substitution.sourceIngredientClientId !== clientId
      ),
    }));
  }

  function duplicateIngredient(clientId: string) {
    const duplicateId = createLocalId("ingredient");
    setOpenIngredientId(duplicateId);
    setState((current) => {
      const sourceIndex = current.ingredients.findIndex(
        (ingredient) => ingredient.clientId === clientId
      );
      if (sourceIndex < 0) return current;
      const duplicate = {
        ...current.ingredients[sourceIndex],
        clientId: duplicateId,
      };
      const ingredients = [...current.ingredients];
      ingredients.splice(sourceIndex + 1, 0, duplicate);
      return { ...current, ingredients };
    });
  }

  function moveIngredient(
    clientId: string,
    sectionPosition: number,
    direction: -1 | 1
  ) {
    setState((current) => {
      const groupIndexes = current.ingredients.flatMap((ingredient, index) =>
        ingredient.sectionPosition === sectionPosition ? [index] : []
      );
      const currentGroupIndex = groupIndexes.findIndex(
        (index) => current.ingredients[index]?.clientId === clientId
      );
      const targetGroupIndex = currentGroupIndex + direction;
      if (targetGroupIndex < 0 || targetGroupIndex >= groupIndexes.length) {
        return current;
      }
      const next = [...current.ingredients];
      const left = groupIndexes[currentGroupIndex];
      const right = groupIndexes[targetGroupIndex];
      [next[left], next[right]] = [next[right], next[left]];
      return { ...current, ingredients: next };
    });
  }

  function addSection() {
    setState((current) => ({
      ...current,
      ingredientSections: [
        ...current.ingredientSections,
        {
          name: `Section ${current.ingredientSections.length + 1}`,
          position: current.ingredientSections.length,
        },
      ],
    }));
  }

  function moveSection(index: number, direction: -1 | 1) {
    setState((current) => {
      const target = index + direction;
      if (target < 0 || target >= current.ingredientSections.length) return current;
      const sections = [...current.ingredientSections];
      [sections[index], sections[target]] = [sections[target], sections[index]];
      const oldToNew = new Map(
        sections.map((section, newPosition) => [section.position, newPosition])
      );
      return {
        ...current,
        ingredientSections: sections.map((section, position) => ({
          ...section,
          position,
        })),
        ingredients: current.ingredients.map((ingredient) => ({
          ...ingredient,
          sectionPosition: oldToNew.get(ingredient.sectionPosition ?? 0) ?? 0,
        })),
      };
    });
  }

  function removeSection(index: number) {
    if (state.ingredientSections.length === 1) return;
    const section = state.ingredientSections[index];
    setState((current) => {
              const kept = current.ingredientSections.filter(
                (_, sectionIndex) => sectionIndex !== index
              );
              const oldToNew = new Map(
                kept.map((item, newPosition) => [item.position, newPosition])
              );
              const removedIngredientIds = new Set(
                current.ingredients
                  .filter(
                    (ingredient) =>
                      ingredient.sectionPosition === section.position
                  )
                  .map((ingredient) => ingredient.clientId)
              );
      return {
                ...current,
                ingredientSections: kept.map((item, position) => ({
                  ...item,
                  position,
                })),
                ingredients: current.ingredients
                  .filter(
                    (ingredient) =>
                      ingredient.sectionPosition !== section.position
                  )
                  .map((ingredient) => ({
                    ...ingredient,
                    sectionPosition:
                      oldToNew.get(ingredient.sectionPosition ?? 0) ?? 0,
                  })),
                substitutions: current.substitutions.filter(
                  (substitution) =>
                    !removedIngredientIds.has(
                      substitution.sourceIngredientClientId ?? undefined
                    )
                ),
      };
    });
  }

  return (
    <>
      <EditorStageIntro eyebrow="Ingredients" title="Build the ingredient list">
        Type the amount and ingredient together. You can organise longer recipes into sections.
      </EditorStageIntro>

      {state.ingredientSections.map((section, sectionIndex) => {
        const sectionIngredients = state.ingredients.filter(
          (ingredient) => ingredient.sectionPosition === section.position
        );
        return (
          <View key={`${section.position}-${sectionIndex}`} style={styles.sectionWrap}>
            {state.ingredientSections.length > 1 ? (
              <View style={styles.sectionHeader}>
                <TextInput
                  value={section.name}
                  onChangeText={(name) =>
                    setState((current) => ({
                      ...current,
                      ingredientSections: current.ingredientSections.map(
                        (item, index) =>
                          index === sectionIndex ? { ...item, name } : item
                      ),
                    }))
                  }
                  maxLength={100}
                  placeholder="Section name, e.g. For the sauce"
                  placeholderTextColor={theme.colors.textMuted}
                  style={styles.sectionName}
                />
                <Pressable
                  accessibilityLabel={`More options for ${section.name}`}
                  onPress={() =>
                    openSheet(
                      <RecipeEditorActionSheet
                        actions={[
                          {
                            label: "Move section up",
                            disabled: sectionIndex === 0,
                            onPress: () => moveSection(sectionIndex, -1),
                          },
                          {
                            label: "Move section down",
                            disabled:
                              sectionIndex === state.ingredientSections.length - 1,
                            onPress: () => moveSection(sectionIndex, 1),
                          },
                          {
                            label: "Delete section",
                            danger: true,
                            disabled: state.ingredientSections.length === 1,
                            onPress: () => removeSection(sectionIndex),
                          },
                        ]}
                      />
                    )
                  }
                  style={styles.moreButton}
                >
                  <Icon name="moreH" size={17} color={theme.colors.text} />
                </Pressable>
              </View>
            ) : null}

            {sectionIngredients.map((ingredient, ingredientIndex) => {
              const clientId = ingredient.clientId ?? "";
              const catalogueIngredient = ingredient.ingredientId
                ? catalogueById.get(ingredient.ingredientId)
                : undefined;
              const displayName =
                ingredient.ingredientName ||
                catalogueIngredient?.displayName ||
                "Ingredient";
              return (
                <IngredientCard
                  key={clientId}
                  ingredient={ingredient}
                  displayName={displayName}
                  catalogueIngredient={catalogueIngredient}
                  units={units}
                  defaultUnitMode={defaultUnitMode}
                  canMoveUp={ingredientIndex > 0}
                  canMoveDown={ingredientIndex < sectionIngredients.length - 1}
                  open={openIngredientId === clientId}
                  onOpenChange={(open) =>
                    setOpenIngredientId(open ? clientId : null)
                  }
                  onUpdate={(patch) => updateIngredient(clientId, patch)}
                  onMove={(direction) =>
                    moveIngredient(clientId, section.position, direction)
                  }
                  onRemove={() => removeIngredient(clientId)}
                  onDuplicate={() => duplicateIngredient(clientId)}
                />
              );
            })}

            {!sectionIngredients.length ? (
              <AppText style={styles.emptyText}>No ingredients yet.</AppText>
            ) : null}
            <RecipeIngredientQuickAdd
              catalog={ingredientCatalog}
              units={units}
              onAdd={(ingredient) => addIngredient(section.position, ingredient)}
              onUseCustom={() =>
                openCustomIngredientSheet((ingredient) =>
                  addIngredient(section.position, ingredient)
                )
              }
            />
          </View>
        );
      })}

      <Pressable onPress={addSection} style={styles.addSection}>
        <Icon name="plus" size={15} color={theme.colors.navy3} />
        <AppText style={styles.addSectionText}>Add ingredient section</AppText>
      </Pressable>
    </>
  );
}

function IngredientCard({
  ingredient,
  displayName,
  catalogueIngredient,
  units,
  defaultUnitMode,
  canMoveUp,
  canMoveDown,
  open,
  onOpenChange,
  onUpdate,
  onMove,
  onRemove,
  onDuplicate,
}: {
  ingredient: RecipeIngredientInput;
  displayName: string;
  catalogueIngredient?: Ingredient;
  units: Unit[];
  defaultUnitMode: "metric" | "cups" | "imperial";
  canMoveUp: boolean;
  canMoveDown: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate: (patch: Partial<RecipeIngredientInput>) => void;
  onMove: (direction: -1 | 1) => void;
  onRemove: () => void;
  onDuplicate: () => void;
}) {
  const [showDetails, setShowDetails] = useState(
    Boolean(ingredient.sizeNote || ingredient.preparationNote || ingredient.isOptional)
  );
  const [nameFocused, setNameFocused] = useState(false);
  const unit = units.find((item) => item.id === ingredient.unit);
  const preferredContext = ingredient.isCustom
    ? customBasisToContext(ingredient.customMeasurementBasis)
    : catalogueIngredient?.conversionContext;

  function openRowMenu() {
    openSheet(
      <RecipeEditorActionSheet
        actions={[
          { label: "Duplicate ingredient", onPress: onDuplicate },
          { label: "Move up", disabled: !canMoveUp, onPress: () => onMove(-1) },
          { label: "Move down", disabled: !canMoveDown, onPress: () => onMove(1) },
          { label: "Delete ingredient", danger: true, onPress: onRemove },
        ]}
      />
    );
  }

  function openFullPageUnitPicker() {
    const compatibleUnits = getCompatibleAuthoringUnits(units, preferredContext);
    setRecipeUnitPicker({
      units: compatibleUnits,
      selected: ingredient.unit ?? null,
      recommended: getRecommendedAuthoringUnit(
        compatibleUnits,
        preferredContext,
        defaultUnitMode
      ),
      onSelect: (unit) => onUpdate({ unit }),
    });
    router.push("/creator/unit-picker" as Href);
  }

  if (!open) {
    const summary = ingredientSummary(ingredient, unit?.name);
    const supportingDetails = [
      ingredient.sizeNote,
      ingredient.preparationNote,
      ingredient.isOptional ? "Optional" : null,
    ].filter(Boolean).join(" · ");
    const needsUnit =
      (ingredient.quantityMode ?? "exact") === "exact" &&
      Boolean(ingredient.quantity) &&
      !unit &&
      getCompatibleAuthoringUnits(units, preferredContext).length > 0;

    return (
      <View style={styles.collapsedIngredient}>
        <Pressable
          accessibilityLabel={`Edit ${displayName}`}
          onPress={() => onOpenChange(true)}
          style={styles.collapsedIngredientMain}
        >
          <View style={styles.collapsedIngredientCopy}>
            <AppText style={styles.collapsedIngredientText}>
              <AppText style={[styles.collapsedIngredientAmount, !summary && styles.collapsedIngredientAmountMissing]}>
                {summary || "No amount"}
              </AppText>{" "}
              <AppText style={styles.collapsedIngredientName}>{displayName}</AppText>
            </AppText>
            {supportingDetails ? (
              <AppText style={styles.collapsedIngredientMeta}>{supportingDetails}</AppText>
            ) : needsUnit ? (
              <AppText style={styles.collapsedIngredientWarning}>Tap to choose a unit</AppText>
            ) : null}
          </View>
          <Icon name="chevronRight" size={14} color={theme.colors.textMuted} />
        </Pressable>
        <Pressable
          accessibilityLabel="More options for ingredient"
          onPress={openRowMenu}
          style={styles.moreButton}
        >
          <Icon name="moreH" size={17} color={theme.colors.text} />
        </Pressable>
      </View>
    );
  }

  return (
    <Card style={styles.ingredientEditor}>
      <View style={styles.ingredientHeader}>
        <AppText style={styles.editIngredientLabel}>Edit ingredient</AppText>
        <Pressable
          accessibilityLabel="More options for ingredient"
          onPress={openRowMenu}
          style={styles.editorMoreButton}
        >
          <Icon name="moreH" size={17} color={theme.colors.text} />
        </Pressable>
      </View>

      <View style={styles.ingredientNameBlock}>
        <AppText style={styles.controlLabel}>Ingredient</AppText>
        <TextInput
          value={displayName}
          editable={Boolean(ingredient.isCustom)}
          onChangeText={(ingredientName) =>
            onUpdate({ ingredientName, rawText: ingredientName })
          }
          placeholder="Search ingredients"
          placeholderTextColor={theme.colors.textMuted}
          onFocus={() => setNameFocused(true)}
          onBlur={() => setNameFocused(false)}
          style={[
            styles.ingredientNameInput,
            nameFocused && styles.ingredientNameInputFocused,
          ]}
        />
      </View>

      <AppText style={styles.controlLabel}>Amount type</AppText>
      <ScrollView
        horizontal
        style={styles.amountModesScroll}
        contentContainerStyle={styles.amountModes}
        showsHorizontalScrollIndicator={false}
      >
        {QUANTITY_MODES.map((mode) => {
          const selected = mode.value === (ingredient.quantityMode ?? "exact");
          return <Pressable key={mode.value} onPress={() => onUpdate({ quantityMode: mode.value })}
            style={[styles.amountMode, selected && styles.amountModeSelected]}>
            <AppText style={[styles.amountModeText, selected && styles.amountModeTextSelected]}>{mode.label}</AppText>
          </Pressable>;
        })}
      </ScrollView>

      {ingredient.quantityMode === "to_taste" || ingredient.quantityMode === "as_needed" ? (
        <View style={styles.noMeasure}>
          <Icon name="check" size={15} color={theme.colors.navy3} />
          <AppText style={styles.noMeasureText}>{ingredient.quantityMode === "to_taste" ? "To taste" : "As needed"} does not need a numeric amount.</AppText>
        </View>
      ) : (
        <View style={styles.measureRow}>
          <View style={styles.measureControl}>
            <AppText style={styles.measureLabel}>Amount</AppText>
            {ingredient.quantityMode === "range" ? <View style={styles.rangeInputs}>
              <TextInput value={ingredient.quantity ?? ""} onChangeText={(quantity) => onUpdate({ quantity: sanitizeDecimal(quantity) })}
                keyboardType="decimal-pad" placeholder="2" placeholderTextColor={theme.colors.textMuted} style={[styles.measureInput, styles.rangeMeasureInput]} />
              <AppText style={styles.rangeSeparator}>to</AppText>
            <TextInput
              value={ingredient.quantityMax ?? ""}
              onChangeText={(quantityMax) =>
                onUpdate({ quantityMax: sanitizeDecimal(quantityMax) })
              }
              keyboardType="decimal-pad"
              placeholder="3"
              placeholderTextColor={theme.colors.textMuted}
              style={[styles.measureInput, styles.rangeMeasureInput]}
            />
            </View> : <TextInput value={ingredient.quantity ?? ""} onChangeText={(quantity) => onUpdate({ quantity: sanitizeDecimal(quantity) })}
              keyboardType="decimal-pad" placeholder="2" placeholderTextColor={theme.colors.textMuted} style={styles.measureInput} />}
          </View>
        <Pressable
          onPress={openFullPageUnitPicker}
          style={[
            styles.unitSelect,
            !unit && styles.unitSelectMissing,
            unit && styles.unitSelectChosen,
          ]}
        >
          <View style={styles.unitCopy}><AppText style={styles.measureLabel}>Unit</AppText><AppText numberOfLines={1} style={unit ? styles.selectValue : styles.unitPlaceholder}>{unit ? unit.name : "Choose unit"}</AppText></View>
          <Icon name="chevronDown" size={13} color={theme.colors.textMuted} />
        </Pressable>
      </View>)}

      <Pressable onPress={() => setShowDetails((current) => !current)} style={styles.detailsToggle}>
        <View><AppText style={styles.detailsTitle}>Preparation details</AppText><AppText style={styles.detailsCopy}>Size, prep notes and optional status</AppText></View>
        <View style={showDetails && styles.detailsChevronOpen}>
          <Icon name="chevronDown" size={16} color={theme.colors.textMuted} />
        </View>
      </Pressable>
      {showDetails ? (
        <>
          <View style={styles.quantityRow}>
            <View style={styles.sizeField}>
              <AppText style={styles.detailLabel}>Size</AppText>
              <EditorTextInput
                value={ingredient.sizeNote ?? ""}
                onChangeText={(sizeNote) => onUpdate({ sizeNote })}
                maxLength={100}
                placeholder="e.g. medium"
                style={styles.detailInput}
              />
            </View>
            <View style={styles.preparationField}>
              <AppText style={styles.detailLabel}>Preparation</AppText>
              <EditorTextInput
                value={ingredient.preparationNote ?? ""}
                onChangeText={(preparationNote) => onUpdate({ preparationNote })}
                maxLength={1000}
                placeholder="e.g. diced and drained"
                style={styles.detailInput}
              />
            </View>
          </View>

          <Pressable
            onPress={() => onUpdate({ isOptional: !ingredient.isOptional })}
            style={styles.optionalRow}
          >
            <View style={[styles.checkbox, ingredient.isOptional && styles.checkboxActive]}>
              {ingredient.isOptional ? (
                <Icon name="check" size={13} color={theme.colors.white} />
              ) : null}
            </View>
            <View style={styles.optionalCopyWrap}>
              <AppText style={styles.optionalTitle}>Optional ingredient</AppText>
              <AppText style={styles.optionalCopy}>The recipe can still work without it.</AppText>
            </View>
          </Pressable>
        </>
      ) : null}

      <Pressable onPress={() => onOpenChange(false)} style={styles.doneIngredient}>
        <Icon name="check" size={15} color={theme.colors.onDark} />
        <AppText style={styles.doneIngredientText}>Done</AppText>
      </Pressable>
    </Card>
  );
}

function ingredientSummary(
  ingredient: RecipeIngredientInput,
  unitName: string | undefined
) {
  const quantity = ingredient.quantityMode === "range"
    ? [ingredient.quantity, ingredient.quantityMax]
        .filter(Boolean)
        .map((value) => formatQuantityText(value ?? ""))
        .join("–")
    : ingredient.quantityMode === "to_taste"
      ? "To taste"
      : ingredient.quantityMode === "as_needed"
        ? "As needed"
        : ingredient.quantity
          ? formatQuantityText(ingredient.quantity)
          : ingredient.quantity;
  return [quantity, unitName]
    .filter(Boolean)
    .join(" ");
}

function openCustomIngredientSheet(
  onAdd: (ingredient: Omit<RecipeIngredientInput, "position" | "sectionPosition">) => void
) {
  openSheet(<CustomIngredientSheet onAdd={onAdd} />);
}

function CustomIngredientSheet({
  onAdd,
}: {
  onAdd: (ingredient: Omit<RecipeIngredientInput, "position" | "sectionPosition">) => void;
}) {
  const [name, setName] = useState("");
  const [basis, setBasis] = useState<"mass" | "liquid" | "item" | "bunch" | null>(null);

  function add() {
    if (!name.trim() || !basis) return;
    onAdd({
      clientId: createLocalId("ingredient"),
      rawText: name.trim(),
      ingredientName: name.trim(),
      ingredientId: null,
      quantity: null,
      quantityMax: null,
      quantityMode: "exact",
      unit: null,
      preparationNote: null,
      sizeNote: null,
      customMeasurementBasis: basis,
      isCustom: true,
      isOptional: false,
    });
    closeSheet();
  }

  return (
    <View style={styles.sheet}>
      <AppText style={styles.sheetTitle}>Custom ingredient</AppText>
      <AppText style={styles.sheetCopy}>
        Custom ingredients are treated conservatively in dietary and allergen filters.
      </AppText>
      <EditorField label="Ingredient name" required>
        <EditorTextInput
          value={name}
          onChangeText={setName}
          maxLength={200}
          placeholder="Enter the ingredient name"
        />
      </EditorField>
      <EditorField label="Measurement basis" required>
        <ChoiceRow options={[...CUSTOM_BASES]} value={basis} onChange={setBasis} />
      </EditorField>
      <Button title="Add ingredient" disabled={!name.trim() || !basis} onPress={add} />
    </View>
  );
}

function sanitizeDecimal(value: string) {
  const cleaned = value.replace(/[^0-9.]/g, "");
  const [whole, ...decimals] = cleaned.split(".");
  return decimals.length ? `${whole}.${decimals.join("")}` : whole;
}

function customBasisToContext(value?: "mass" | "liquid" | "item" | "bunch" | null) {
  if (value === "liquid") return "volume";
  if (value === "item") return "count";
  return value;
}

function getCompatibleAuthoringUnits(
  units: Unit[],
  preferredContext?: string | null
) {
  const context = normalizeAuthoringContext(preferredContext);
  if (["rice", "plain_flour", "millet", "sorghum"].includes(context)) {
    return units.filter(
      (unit) => unit.context === context || unit.id.toLowerCase() === "mg"
    );
  }

  const contextUnits = units.filter((unit) => unit.context === context);

  // Count-only entries still need practical mass and volume choices for authoring.
  if (context === "count" && contextUnits.length <= 1) {
    return units.filter((unit) =>
      ["mass", "volume", "count"].includes(unit.context)
    );
  }

  return contextUnits;
}

function getRecommendedAuthoringUnit(
  units: Unit[],
  preferredContext: string | null | undefined,
  mode: "metric" | "cups" | "imperial"
) {
  const context = normalizeAuthoringContext(preferredContext);
  const candidates =
    context === "count"
      ? ["item"]
      : mode === "imperial"
        ? context === "volume"
          ? ["us_floz", "imp_floz"]
          : [`${context}_oz`, "oz"]
        : mode === "cups"
          ? context === "volume"
            ? ["milk_cup", "metric_cup", "mL"]
            : [
                `${context}_milk_cup`,
                `${context}_derica_small`,
                `${context}_g`,
                "g",
              ]
          : context === "volume"
            ? ["mL"]
            : [`${context}_g`, "g", "mg"];
  return candidates.find((id) => units.some((unit) => unit.id === id)) ?? units[0]?.id ?? null;
}

function normalizeAuthoringContext(value?: string | null) {
  if (value === "liquid") return "volume";
  if (value === "item" || value === "bunch") return "count";
  return value ?? "mass";
}

const styles = StyleSheet.create({
  sectionWrap: { marginBottom: 30 },
  sectionHeader: { marginBottom: 9, flexDirection: "row", alignItems: "center", gap: 8 },
  sectionName: { flex: 1, minHeight: 42, paddingHorizontal: 2, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: "#D9D9D9", fontFamily: theme.fontFamily.display, fontSize: 16, color: theme.colors.navy },
  moreButton: { width: 40, height: 40, alignItems: "center", justifyContent: "center", borderRadius: 10, backgroundColor: "transparent" },
  emptyText: { paddingHorizontal: 2, paddingTop: 10, paddingBottom: 16, fontSize: 13, color: theme.colors.textMuted },
  addSection: { minHeight: 44, marginBottom: 8, flexDirection: "row", gap: 7, alignItems: "center", justifyContent: "center" },
  addSectionText: { fontFamily: theme.fontFamily.bodyBold, fontSize: 13, color: theme.colors.navy3 },
  collapsedIngredient: { minHeight: 56, paddingLeft: 2, paddingRight: 0, flexDirection: "row", alignItems: "center", gap: 8, borderBottomWidth: 1, borderBottomColor: theme.colors.border, backgroundColor: theme.colors.white },
  collapsedIngredientMain: { minHeight: 54, flex: 1, flexDirection: "row", alignItems: "center", gap: 7 },
  collapsedIngredientCopy: { flex: 1, minWidth: 0, paddingVertical: 13 },
  collapsedIngredientText: { fontSize: 14.5, lineHeight: 20, color: theme.colors.text },
  collapsedIngredientAmount: { fontFamily: theme.fontFamily.bodyBold, color: theme.colors.text },
  collapsedIngredientAmountMissing: { color: theme.colors.textMuted },
  collapsedIngredientName: { fontFamily: theme.fontFamily.bodyMedium, color: theme.colors.text },
  collapsedIngredientMeta: { marginTop: 2, fontSize: 12, color: theme.colors.textMuted },
  collapsedIngredientWarning: { marginTop: 2, fontFamily: theme.fontFamily.bodySemiBold, fontSize: 12, color: theme.colors.gold },
  ingredientEditor: { marginTop: 8, marginBottom: 16, padding: 14, gap: 0, borderWidth: 0, borderRadius: 20, backgroundColor: "#F1F1F1" },
  ingredientHeader: { marginBottom: 10, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  editIngredientLabel: { fontFamily: theme.fontFamily.bodyBold, fontSize: 11, letterSpacing: 0.4, color: "#727272" },
  editorMoreButton: { width: 40, height: 40, alignItems: "center", justifyContent: "center", borderRadius: 12, backgroundColor: theme.colors.white },
  ingredientNameBlock: { marginBottom: 14 },
  controlLabel: { marginBottom: 6, fontFamily: theme.fontFamily.bodySemiBold, fontSize: 11, color: "#686868" },
  ingredientNameInput: { minHeight: 42, paddingHorizontal: 2, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: "#D7D7D7", fontFamily: theme.fontFamily.displaySemiBold, fontSize: 17, color: theme.colors.text },
  ingredientNameInputFocused: { borderBottomColor: "#686868" },
  amountModesScroll: { flexGrow: 0, marginBottom: 12 },
  amountModes: { paddingBottom: 2, flexDirection: "row", gap: 6 },
  amountMode: { minHeight: 34, paddingHorizontal: 12, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "#D7D7D7", borderRadius: 999, backgroundColor: theme.colors.white },
  amountModeSelected: { borderColor: "#17291E", backgroundColor: "#17291E" },
  amountModeText: { fontFamily: theme.fontFamily.bodySemiBold, fontSize: 11.5, color: "#555555" },
  amountModeTextSelected: { color: theme.colors.onDark },
  measureRow: { marginBottom: 12, flexDirection: "row", gap: 8 },
  measureControl: { minHeight: 58, flex: 0.72, paddingHorizontal: 12, paddingVertical: 8, justifyContent: "center", borderWidth: 1, borderColor: theme.colors.border, borderRadius: 14, backgroundColor: theme.colors.white },
  measureLabel: { marginBottom: 2, fontFamily: theme.fontFamily.bodySemiBold, fontSize: 9.5, color: theme.colors.textMuted },
  measureInput: { flex: 1, minWidth: 0, padding: 0, fontFamily: theme.fontFamily.bodySemiBold, fontSize: 15, color: theme.colors.text },
  rangeMeasureInput: { textAlign: "center", fontSize: 14 },
  rangeInputs: { flexDirection: "row", alignItems: "center", gap: 5 },
  noMeasure: { minHeight: 46, marginBottom: 12, paddingHorizontal: 12, flexDirection: "row", alignItems: "center", gap: 8, borderRadius: 14, backgroundColor: theme.colors.white },
  noMeasureText: { flex: 1, fontSize: 11.5, color: "#666666" },
  unitCopy: { flex: 1, minWidth: 0 },
  rangeSeparator: { alignSelf: "center", color: theme.colors.textMuted },
  unitSelect: { minWidth: 88, minHeight: 58, flex: 1.28, paddingHorizontal: 12, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 5, borderWidth: 1, borderRadius: 14 },
  unitSelectMissing: { borderColor: theme.colors.border, backgroundColor: theme.colors.white },
  unitSelectChosen: { borderColor: theme.colors.border, backgroundColor: theme.colors.white },
  selectValue: { flex: 1, fontFamily: theme.fontFamily.bodySemiBold, fontSize: 13, color: theme.colors.text },
  unitPlaceholder: { flex: 1, fontFamily: theme.fontFamily.body, fontSize: 13, color: theme.colors.textMuted },
  detailsToggle: { minHeight: 50, paddingHorizontal: 2, paddingVertical: 6, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12, borderTopWidth: 1, borderTopColor: "#DDDDDD" },
  detailsTitle: { fontFamily: theme.fontFamily.bodySemiBold, fontSize: 12.5, color: theme.colors.text },
  detailsCopy: { marginTop: 2, fontSize: 10.5, color: theme.colors.textMuted },
  detailsChevronOpen: { transform: [{ rotate: "180deg" }] },
  quantityRow: { marginTop: 8, flexDirection: "row", gap: 8 },
  sizeField: { flex: 0.75 },
  preparationField: { flex: 1.25 },
  detailLabel: { marginLeft: 2, marginBottom: 5, fontFamily: theme.fontFamily.bodySemiBold, fontSize: 10, color: theme.colors.textMuted },
  detailInput: { minHeight: 44, paddingHorizontal: 11, borderColor: theme.colors.border, borderRadius: 12, fontSize: 12.5 },
  optionalRow: { minHeight: 50, marginTop: 8, flexDirection: "row", alignItems: "center", gap: 9 },
  checkbox: { width: 22, height: 22, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: theme.colors.borderStrong, borderRadius: 7, backgroundColor: theme.colors.white },
  checkboxActive: { borderColor: theme.colors.navy3, backgroundColor: theme.colors.navy3 },
  optionalTitle: { fontFamily: theme.fontFamily.bodyMedium, fontSize: 12, color: theme.colors.text },
  optionalCopyWrap: { flex: 1 },
  optionalCopy: { marginTop: 2, fontSize: 10.5, color: theme.colors.textMuted },
  doneIngredient: { minWidth: 104, minHeight: 44, marginTop: 10, paddingHorizontal: 17, alignSelf: "flex-end", flexDirection: "row", gap: 7, alignItems: "center", justifyContent: "center", borderRadius: 999, backgroundColor: theme.colors.navy },
  doneIngredientText: { fontFamily: theme.fontFamily.bodyBold, fontSize: 13, color: theme.colors.onDark },
  sheet: { paddingBottom: 24, gap: 13 },
  sheetTitle: { fontFamily: theme.fontFamily.display, fontSize: 22, color: theme.colors.navy },
  sheetCopy: { marginTop: -7, fontSize: 12, lineHeight: 18, color: theme.colors.textMuted },
});
