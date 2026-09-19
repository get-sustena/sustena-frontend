import { useMemo, useRef, useState } from "react";
import { FlatList, Pressable, ScrollView, StyleSheet, TextInput, useWindowDimensions, View } from "react-native";
import { filterPantryPickerIngredients, PANTRY_CATEGORIES } from "../../lib/pantryIngredients";
import { theme } from "../../theme/theme";
import type { Ingredient } from "../../types/api";
import { IngredientImage } from "../ingredient/IngredientImage";
import { AppText } from "../ui/AppText";
import { Icon } from "../ui/Icon";
import { getApiErrorMessage } from "../../lib/api/errors";
import { showToast } from "../../store/uiStore";

type Props = {
  ingredients: Ingredient[];
  savedIngredientIds: string[];
  onClose: () => void;
  onAdd: (ingredientIds: string[]) => Promise<void>;
};

export function PantryIngredientPickerSheet({ ingredients, savedIngredientIds, onClose, onAdd }: Props) {
  const { height } = useWindowDimensions();
  const [search, setSearch] = useState("");
  const [searchFocused, setSearchFocused] = useState(false);
  const [category, setCategory] = useState("All");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const submitting = useRef(false);
  const savedIds = useMemo(() => new Set(savedIngredientIds), [savedIngredientIds]);
  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);
  const isSearching = search.trim().length > 0;
  const filtered = useMemo(
    () => filterPantryPickerIngredients(ingredients, search, category),
    [category, ingredients, search]
  );

  function toggle(ingredientId: string) {
    if (savedIds.has(ingredientId) || submitting.current) return;
    setSelectedIds((current) =>
      current.includes(ingredientId)
        ? current.filter((id) => id !== ingredientId)
        : [...current, ingredientId]
    );
  }

  async function submit() {
    if (!selectedIds.length || submitting.current) return;
    submitting.current = true;
    setIsSubmitting(true);
    try {
      await onAdd(selectedIds);
    } catch (error) {
      showToast(getApiErrorMessage(error), "danger");
    } finally {
      submitting.current = false;
      setIsSubmitting(false);
    }
  }

  return (
    <View style={[styles.sheet, { height: Math.min(680, height * (height <= 700 ? 0.88 : 0.8)) }]}>
      <View style={styles.header}>
        <AppText style={styles.title}>Add ingredients</AppText>
        <Pressable onPress={onClose} style={styles.close} accessibilityLabel="Close ingredient picker">
          <Icon name="close" size={18} color={theme.colors.navy} />
        </Pressable>
      </View>
      {!isSearching ? (
        <AppText style={styles.copy}>
          Add everything you have in your kitchen. More ingredients give you better recipe matches.
        </AppText>
      ) : null}
      <View style={[styles.search, searchFocused && styles.searchFocused]}>
        <Icon name="discover" size={18} color={theme.colors.textMedium} />
        <TextInput
          value={search}
          onChangeText={setSearch}
          onFocus={() => setSearchFocused(true)}
          onBlur={() => setSearchFocused(false)}
          placeholder="Search ingredients"
          placeholderTextColor={theme.colors.textMuted}
          returnKeyType="search"
          style={styles.searchInput}
        />
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll} contentContainerStyle={styles.categories}>
        {PANTRY_CATEGORIES.map((item) => (
          <Pressable key={item} onPress={() => setCategory(item)} style={[styles.category, category === item && styles.categoryActive]}>
            <AppText style={[styles.categoryText, category === item && styles.categoryTextActive]}>{item}</AppText>
          </Pressable>
        ))}
      </ScrollView>
      <View style={styles.countRow}>
        <AppText style={styles.count}>
          {filtered.length} ingredient{filtered.length === 1 ? "" : "s"}{isSearching ? " found" : ""}
        </AppText>
        {selectedIds.length ? (
          <Pressable onPress={() => setSelectedIds([])} style={styles.clearButton}>
            <AppText style={styles.clear}>Clear selection</AppText>
          </Pressable>
        ) : null}
      </View>
      <FlatList
        key={isSearching ? "search-results" : "ingredient-list"}
        data={filtered}
        keyExtractor={(ingredient) => ingredient.id}
        numColumns={isSearching ? 2 : 1}
        columnWrapperStyle={isSearching ? styles.gridRow : undefined}
        style={styles.results}
        contentContainerStyle={[styles.resultsContent, isSearching ? styles.gridContent : styles.listContent]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        initialNumToRender={18}
        maxToRenderPerBatch={24}
        windowSize={7}
        ListEmptyComponent={<AppText style={styles.noResults}>No matching ingredients. Try another search.</AppText>}
        renderItem={({ item: ingredient }) => {
              const saved = savedIds.has(ingredient.id);
              const selected = selectedSet.has(ingredient.id);
              if (saved) {
                return (
                  <View
                    key={ingredient.id}
                    accessibilityRole="text"
                    style={isSearching ? [styles.gridItem, styles.gridItemSelected] : styles.row}
                  >
                    <IngredientImage ingredientId={ingredient.id} name={ingredient.displayName} size={isSearching ? 34 : 40} style={isSearching ? styles.gridThumb : styles.thumb} />
                    <View style={styles.rowCopy}>
                      <AppText style={isSearching ? styles.gridName : styles.name} numberOfLines={isSearching ? 2 : 1}>
                        {ingredient.displayName}
                      </AppText>
                      {isSearching ? <AppText style={styles.gridSaved}>In pantry</AppText> : null}
                    </View>
                    {!isSearching ? <View style={styles.savedBadge}><AppText style={styles.savedBadgeText}>In pantry</AppText></View> : null}
                    {isSearching ? <View style={styles.gridCheck}><Icon name="check" size={12} color="#FFFFFF" /></View> : null}
                  </View>
                );
              }
              return (
                <Pressable
                  key={ingredient.id}
                  onPress={() => toggle(ingredient.id)}
                  disabled={isSubmitting}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: selected, disabled: isSubmitting }}
                  style={isSearching ? [styles.gridItem, selected && styles.gridItemSelected] : [styles.row, selected && styles.rowSelected]}
                >
                  {!isSearching ? (
                    <View style={[styles.checkbox, selected && styles.checkboxSelected]}>
                      {selected ? <Icon name="check" size={14} color="#FFFFFF" /> : null}
                    </View>
                  ) : null}
                  <IngredientImage ingredientId={ingredient.id} name={ingredient.displayName} size={isSearching ? 34 : 40} style={isSearching ? styles.gridThumb : styles.thumb} />
                  <View style={styles.rowCopy}>
                    <AppText style={isSearching ? styles.gridName : styles.name} numberOfLines={isSearching ? 2 : 1}>
                      {ingredient.displayName}
                    </AppText>
                  </View>
                  {isSearching && selected ? <View style={styles.gridCheck}><Icon name="check" size={12} color="#FFFFFF" /></View> : null}
                </Pressable>
              );
        }}
      />
      {selectedIds.length ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.selectedScroll} contentContainerStyle={styles.selectedTray}>
          {selectedIds.map((ingredientId) => {
            const ingredient = ingredients.find((item) => item.id === ingredientId);
            if (!ingredient) return null;
            return (
              <Pressable key={ingredientId} onPress={() => toggle(ingredientId)} style={styles.selectedPill} accessibilityLabel={`Remove ${ingredient.displayName} from selection`}>
                <AppText style={styles.selectedPillText} numberOfLines={1}>{ingredient.displayName}</AppText>
                <Icon name="close" size={11} color="#1F7048" />
              </Pressable>
            );
          })}
        </ScrollView>
      ) : null}
      <Pressable disabled={!selectedIds.length || isSubmitting} onPress={() => void submit()} style={[styles.addButton, (!selectedIds.length || isSubmitting) && styles.disabled]}>
        <AppText style={styles.addButtonText}>
          {isSubmitting ? "Adding..." : selectedIds.length ? `Add ${selectedIds.length} ingredient${selectedIds.length === 1 ? "" : "s"}` : "Add ingredients"}
        </AppText>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  sheet: { maxHeight: "100%", flexShrink: 1, paddingBottom: 16 },
  header: { minHeight: 58, flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingBottom: 10 },
  title: { fontFamily: theme.fontFamily.display, fontSize: 21, lineHeight: 24, color: theme.colors.navy },
  close: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  copy: { fontFamily: theme.fontFamily.body, fontSize: 12.5, lineHeight: 18, color: theme.colors.textMedium, marginBottom: 12 },
  search: { minHeight: 48, borderWidth: 0.75, borderColor: theme.colors.border, borderRadius: 13, backgroundColor: theme.colors.white, paddingHorizontal: 13, flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 12 },
  searchFocused: { borderColor: "#1F7048", boxShadow: "0 0 0 3px rgba(31,112,72,0.10)" },
  searchInput: { flex: 1, minWidth: 0, fontFamily: theme.fontFamily.body, fontSize: 14.5, color: theme.colors.text, outlineStyle: "none" } as never,
  categoryScroll: { flexGrow: 0, flexShrink: 0, marginBottom: 13 },
  categories: { gap: 6, alignItems: "center", paddingRight: 48 },
  category: { minHeight: 32, justifyContent: "center", paddingHorizontal: 11, borderRadius: 999, borderWidth: 0.75, borderColor: theme.colors.border, backgroundColor: theme.colors.white },
  categoryActive: { backgroundColor: theme.colors.navy, borderColor: theme.colors.navy },
  categoryText: { fontFamily: theme.fontFamily.bodySemiBold, fontSize: 11.75, color: theme.colors.textMedium },
  categoryTextActive: { color: theme.colors.onDark },
  countRow: { minHeight: 28, flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 9 },
  count: { fontFamily: theme.fontFamily.bodySemiBold, fontSize: 12.5, color: theme.colors.textMedium },
  clearButton: { minHeight: 40, justifyContent: "center", paddingHorizontal: 4 },
  clear: { fontFamily: theme.fontFamily.bodyBold, fontSize: 12.5, color: "#1F7048" },
  results: { flex: 1, minHeight: 0 },
  resultsContent: { paddingBottom: 10 },
  listContent: { gap: 6 },
  gridContent: { gap: 8 },
  gridRow: { gap: 8 },
  row: { minHeight: 56, flexDirection: "row", alignItems: "center", gap: 9, paddingHorizontal: 4, paddingVertical: 7 },
  rowSelected: { backgroundColor: theme.colors.card2, borderRadius: 12, paddingHorizontal: 8 },
  checkbox: { width: 24, height: 24, borderRadius: 7, borderWidth: 1.7, borderColor: "#909090", backgroundColor: theme.colors.white, alignItems: "center", justifyContent: "center" },
  checkboxSelected: { backgroundColor: "#1F7048", borderColor: "#1F7048" },
  thumb: { width: 40, height: 40 },
  rowCopy: { flex: 1, minWidth: 0 },
  name: { fontFamily: theme.fontFamily.bodySemiBold, fontSize: 14.5, color: theme.colors.text },
  savedBadge: { minHeight: 24, paddingHorizontal: 9, borderRadius: 999, backgroundColor: theme.colors.card2, justifyContent: "center" },
  savedBadgeText: { fontFamily: theme.fontFamily.bodyBold, fontSize: 10.5, color: "#1F7048" },
  gridItem: { width: "48.8%", minHeight: 58, flexDirection: "row", alignItems: "center", gap: 7, paddingHorizontal: 8, paddingVertical: 7, borderWidth: 0.75, borderColor: theme.colors.border, borderRadius: 14, backgroundColor: theme.colors.white },
  gridItemSelected: { borderColor: "#B9C9AB", backgroundColor: theme.colors.card2 },
  gridThumb: { width: 34, height: 34 },
  gridName: { fontFamily: theme.fontFamily.bodySemiBold, fontSize: 12.5, lineHeight: 15.25, color: theme.colors.text },
  gridSaved: { fontFamily: theme.fontFamily.bodySemiBold, fontSize: 9.5, color: "#1F7048", marginTop: 2 },
  gridCheck: { width: 20, height: 20, borderRadius: 10, backgroundColor: "#1F7048", alignItems: "center", justifyContent: "center" },
  noResults: { paddingHorizontal: 16, paddingVertical: 30, textAlign: "center", fontFamily: theme.fontFamily.body, fontSize: 13, lineHeight: 19, color: theme.colors.textMedium },
  selectedScroll: { flexGrow: 0, flexShrink: 0, marginBottom: 10 },
  selectedTray: { gap: 6, alignItems: "center", paddingVertical: 2 },
  selectedPill: { minHeight: 32, maxWidth: 172, borderWidth: 0.75, borderColor: theme.colors.border, borderRadius: 999, paddingLeft: 11, paddingRight: 8, backgroundColor: theme.colors.card2, flexDirection: "row", alignItems: "center", gap: 6 },
  selectedPillText: { maxWidth: 136, fontFamily: theme.fontFamily.bodySemiBold, fontSize: 11.75, color: theme.colors.navy },
  addButton: { minHeight: 52, borderRadius: 999, backgroundColor: theme.colors.navy, alignItems: "center", justifyContent: "center", marginTop: 10 },
  addButtonText: { fontFamily: theme.fontFamily.bodyBold, fontSize: 14.5, color: theme.colors.onDark },
  disabled: { opacity: 0.48 },
});
