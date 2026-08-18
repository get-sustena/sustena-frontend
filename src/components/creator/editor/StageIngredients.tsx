import { Href, router } from "expo-router";
import { Dispatch, SetStateAction, useMemo, useState } from "react";
import {
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import { createLocalId } from "../../../lib/id";
import { RecipeEditorState } from "../../../lib/creatorRecipes/editorState";
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
  EditorTextInput,
  StageRequirementNote,
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
      <StageRequirementNote />

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
                  placeholder="Section name"
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
        <AppText style={styles.addSectionText}>+ Add section</AppText>
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

  function openQuantityModeMenu() {
    openSheet(
      <RecipeEditorActionSheet
        actions={QUANTITY_MODES.map((mode) => ({
          label: mode.label === "Exact" ? "Exact amount" : mode.label,
          onPress: () => onUpdate({ quantityMode: mode.value }),
        }))}
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
    return (
      <View style={styles.collapsedIngredient}>
        <Pressable
          accessibilityLabel={`Edit ${displayName}`}
          onPress={() => onOpenChange(true)}
          style={styles.collapsedIngredientMain}
        >
          <AppText style={styles.collapsedIngredientText}>
            {ingredientSummary(ingredient, unit?.name, displayName)}
          </AppText>
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
        <TextInput
          value={displayName}
          editable={Boolean(ingredient.isCustom)}
          onChangeText={(ingredientName) =>
            onUpdate({ ingredientName, rawText: ingredientName })
          }
          placeholder="Search ingredients"
          placeholderTextColor={theme.colors.textMuted}
          style={styles.ingredientNameInput}
        />
        <Pressable
          accessibilityLabel="More options for ingredient"
          onPress={openRowMenu}
          style={styles.moreButton}
        >
          <Icon name="moreH" size={17} color={theme.colors.text} />
        </Pressable>
      </View>

      <View style={styles.compactControls}>
        <TextInput
          value={ingredient.quantity ?? ""}
          editable={
            ingredient.quantityMode !== "to_taste" &&
            ingredient.quantityMode !== "as_needed"
          }
          onChangeText={(quantity) =>
            onUpdate({ quantity: sanitizeDecimal(quantity) })
          }
          keyboardType="decimal-pad"
          placeholder={
            ingredient.quantityMode === "to_taste"
              ? "To taste"
              : ingredient.quantityMode === "as_needed"
                ? "As needed"
                : "e.g. 4"
          }
          placeholderTextColor={theme.colors.textMuted}
          style={[
            styles.quantityInput,
            (ingredient.quantityMode === "to_taste" ||
              ingredient.quantityMode === "as_needed") &&
              styles.quantityInputDisabled,
          ]}
        />
        {ingredient.quantityMode === "range" ? (
          <>
            <AppText style={styles.rangeSeparator}>–</AppText>
            <TextInput
              value={ingredient.quantityMax ?? ""}
              onChangeText={(quantityMax) =>
                onUpdate({ quantityMax: sanitizeDecimal(quantityMax) })
              }
              keyboardType="decimal-pad"
              placeholder="e.g. 6"
              placeholderTextColor={theme.colors.textMuted}
              style={styles.quantityInput}
            />
          </>
        ) : null}
        <Pressable
          onPress={openFullPageUnitPicker}
          style={[
            styles.unitSelect,
            !unit && styles.unitSelectMissing,
            unit && styles.unitSelectChosen,
          ]}
        >
          <AppText
            numberOfLines={1}
            style={unit ? styles.selectValue : styles.unitPlaceholder}
          >
            {unit ? unit.name : "Choose unit"}
          </AppText>
          <Icon name="chevronDown" size={13} color={theme.colors.textMuted} />
        </Pressable>
        <Pressable onPress={openQuantityModeMenu} style={styles.modeSelect}>
          <AppText style={styles.modeText}>
            {QUANTITY_MODES.find((mode) => mode.value === (ingredient.quantityMode ?? "exact"))?.label}
          </AppText>
          <Icon name="chevronDown" size={11} color={theme.colors.navy3} />
        </Pressable>
      </View>

      <Pressable onPress={() => setShowDetails((current) => !current)}>
        <AppText style={styles.ingredientDetailsLabel}>
          {showDetails
            ? "Hide size or preparation note"
            : "+ Add size, prep note, or mark optional"}
        </AppText>
      </Pressable>
      {showDetails ? (
        <>
          <View style={styles.quantityRow}>
            <EditorTextInput
              value={ingredient.sizeNote ?? ""}
              onChangeText={(sizeNote) => onUpdate({ sizeNote })}
              maxLength={100}
              placeholder="e.g. medium"
              style={styles.detailInput}
            />
            <EditorTextInput
              value={ingredient.preparationNote ?? ""}
              onChangeText={(preparationNote) => onUpdate({ preparationNote })}
              maxLength={1000}
              placeholder="e.g. diced and drained"
              style={styles.detailInput}
            />
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
            <AppText style={styles.optionalTitle}>Optional ingredient</AppText>
          </Pressable>
        </>
      ) : null}

      <Pressable onPress={() => onOpenChange(false)} style={styles.doneIngredient}>
        <AppText style={styles.doneIngredientText}>Done</AppText>
      </Pressable>
    </Card>
  );
}

function ingredientSummary(
  ingredient: RecipeIngredientInput,
  unitName: string | undefined,
  displayName: string
) {
  const quantity = ingredient.quantityMode === "range"
    ? [ingredient.quantity, ingredient.quantityMax].filter(Boolean).join("–")
    : ingredient.quantityMode === "to_taste"
      ? "To taste"
      : ingredient.quantityMode === "as_needed"
        ? "As needed"
        : ingredient.quantity;
  return [quantity, unitName, ingredient.sizeNote, displayName]
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

  // A count-only ingredient such as a pepper should not leave the author with
  // "Pieces" as the sole option. Generic mass and volume measurements remain
  // useful authoring choices even when the catalogue has no specific conversion
  // context for that ingredient.
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
  sectionWrap: { marginBottom: 12 },
  sectionHeader: { marginBottom: 9, flexDirection: "row", alignItems: "center", gap: 8 },
  sectionName: { flex: 1, minHeight: 38, paddingHorizontal: 1, borderBottomWidth: 1, borderBottomColor: theme.colors.border, fontFamily: theme.fontFamily.display, fontSize: 15, color: theme.colors.navy },
  moreButton: { width: 34, height: 34, alignItems: "center", justifyContent: "center", borderRadius: 9, backgroundColor: theme.colors.surface2 },
  emptyText: { marginBottom: 10, fontSize: 13.5, color: theme.colors.textMuted },
  addSection: { minHeight: 48, marginBottom: 8, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: theme.colors.border, borderRadius: 999, backgroundColor: theme.colors.white },
  addSectionText: { fontFamily: theme.fontFamily.bodySemiBold, fontSize: 13.5, color: theme.colors.text },
  collapsedIngredient: { minHeight: 56, marginBottom: 8, paddingLeft: 13, paddingRight: 10, flexDirection: "row", alignItems: "center", gap: 8, borderWidth: 1, borderColor: theme.colors.border, borderRadius: 13, backgroundColor: theme.colors.white },
  collapsedIngredientMain: { minHeight: 54, flex: 1, flexDirection: "row", alignItems: "center", gap: 7 },
  collapsedIngredientText: { flex: 1, fontFamily: theme.fontFamily.bodySemiBold, fontSize: 13, lineHeight: 18, color: theme.colors.text },
  ingredientEditor: { borderColor: theme.colors.text },
  ingredientHeader: { flexDirection: "row", alignItems: "center", gap: 7 },
  ingredientNameInput: { flex: 1, minHeight: 42, paddingHorizontal: 12, borderRadius: 10, backgroundColor: theme.colors.surface2, fontFamily: theme.fontFamily.bodyMedium, fontSize: 13, color: theme.colors.text },
  compactControls: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 8 },
  quantityInput: { width: 74, minHeight: 44, paddingHorizontal: 10, textAlign: "center", borderWidth: 1, borderColor: theme.colors.border, borderRadius: 10, backgroundColor: theme.colors.surface2, fontFamily: theme.fontFamily.body, fontSize: 13.5, color: theme.colors.text },
  quantityInputDisabled: { color: theme.colors.textMuted },
  rangeSeparator: { alignSelf: "center", color: theme.colors.textMuted },
  unitSelect: { minWidth: 88, minHeight: 44, flex: 1, paddingHorizontal: 12, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 5, borderWidth: 1, borderRadius: 10 },
  unitSelectMissing: { borderColor: theme.colors.gold, backgroundColor: theme.colors.surface2 },
  unitSelectChosen: { borderColor: theme.colors.border, backgroundColor: theme.colors.white },
  selectValue: { flex: 1, fontSize: 13, color: theme.colors.text },
  unitPlaceholder: { flex: 1, fontFamily: theme.fontFamily.bodySemiBold, fontSize: 13.5, color: theme.colors.gold },
  modeSelect: { minHeight: 42, paddingHorizontal: 3, flexDirection: "row", alignItems: "center", gap: 2 },
  modeText: { fontSize: 11.5, color: theme.colors.navy3 },
  ingredientDetailsLabel: { marginTop: 2, fontFamily: theme.fontFamily.body, fontSize: 12, color: theme.colors.textMuted },
  quantityRow: { flexDirection: "row", gap: 7 },
  detailInput: { minHeight: 42, flex: 1, paddingHorizontal: 10, fontSize: 12 },
  optionalRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  checkbox: { width: 18, height: 18, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: theme.colors.borderStrong, borderRadius: 1 },
  checkboxActive: { borderColor: theme.colors.navy, backgroundColor: theme.colors.navy },
  optionalTitle: { fontFamily: theme.fontFamily.bodyMedium, fontSize: 12, color: theme.colors.text },
  doneIngredient: { minHeight: 42, alignItems: "center", justifyContent: "center", borderRadius: 999, backgroundColor: theme.colors.navy },
  doneIngredientText: { fontFamily: theme.fontFamily.bodySemiBold, fontSize: 12, color: theme.colors.onDark },
  sheet: { paddingBottom: 24, gap: 13 },
  sheetTitle: { fontFamily: theme.fontFamily.display, fontSize: 22, color: theme.colors.navy },
  sheetCopy: { marginTop: -7, fontSize: 12, lineHeight: 18, color: theme.colors.textMuted },
  searchRow: { minHeight: 46, paddingHorizontal: 12, flexDirection: "row", alignItems: "center", gap: 8, borderWidth: 1, borderColor: theme.colors.border, borderRadius: 11, backgroundColor: theme.colors.surface2 },
  searchInput: { flex: 1, paddingVertical: 0, fontFamily: theme.fontFamily.body, fontSize: 13, color: theme.colors.text },
  sheetList: { maxHeight: 390 },
  sheetOption: { minHeight: 54, flexDirection: "row", alignItems: "center", gap: 10, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  sheetOptionCopy: { flex: 1 },
  sheetOptionTitle: { fontFamily: theme.fontFamily.bodyMedium, fontSize: 13.5 },
  sheetOptionMeta: { marginTop: 2, fontSize: 10.5, color: theme.colors.textMuted },
  sheetButton: { marginTop: 1 },
});
