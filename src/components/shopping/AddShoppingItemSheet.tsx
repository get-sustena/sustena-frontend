import { useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, TextInput, View } from "react-native";
import { useIngredientCatalogQuery } from "../../hooks/api/useIngredients";
import type { ShoppingListItem } from "../../types/shoppingList";
import { theme } from "../../theme/theme";
import { closeSheet } from "../../store/uiStore";
import { AppText } from "../ui/AppText";
import { Icon } from "../ui/Icon";

type Props = {
  listName: string;
  existingItems: ShoppingListItem[];
  onAdd: (name: string, quantity: string, ingredientId?: string, category?: string) => Promise<ShoppingListItem>;
  onEdit: (item: ShoppingListItem) => void;
};

const SUGGESTED = ["Long Grain Rice", "Chicken Pieces", "Fresh Tomatoes", "Onions", "Eggs", "Milk", "Bread", "Salt"];

export function AddShoppingItemSheet({ listName, existingItems, onAdd, onEdit }: Props) {
  const ingredientsQuery = useIngredientCatalogQuery();
  const [search, setSearch] = useState("");
  const [addedNames, setAddedNames] = useState(() => new Set(existingItems.map((item) => item.name.toLowerCase())));
  const [newItems, setNewItems] = useState<ShoppingListItem[]>([]);
  const [pendingName, setPendingName] = useState<string | null>(null);
  const [confirmation, setConfirmation] = useState("");
  const query = search.trim().toLowerCase();
  const catalog = ingredientsQuery.data ?? [];
  const suggested = SUGGESTED.map((name) => catalog.find((ingredient) => ingredient.displayName.toLowerCase() === name.toLowerCase())).filter((ingredient) => ingredient !== undefined);
  const displayed = query
    ? catalog.filter((ingredient) => [ingredient.displayName, ingredient.canonicalName, ...ingredient.aliases].join(" ").toLowerCase().includes(query)).slice(0, 12)
    : suggested.length ? suggested : catalog.slice(0, 8);
  const exactMatch = query && catalog.some((ingredient) => ingredient.displayName.toLowerCase() === query);

  async function add(name: string, ingredientId?: string, category?: string) {
    const trimmed = name.trim();
    const normalized = trimmed.toLowerCase();
    if (!trimmed || pendingName) return;
    if (addedNames.has(normalized)) {
      setConfirmation(`Already in your list · ${trimmed}`);
      return;
    }
    setPendingName(normalized);
    try {
      const created = await onAdd(trimmed, "1 unit", ingredientId, category);
      setNewItems((current) => [...current, created]);
      setAddedNames((current) => new Set(current).add(normalized));
      setConfirmation(`Added ${trimmed}`);
      if (query === normalized) setSearch("");
    } finally {
      setPendingName(null);
    }
  }

  function row(name: string, category: string, ingredientId?: string) {
    const existing = [...existingItems, ...newItems].find((item) => item.name.toLowerCase() === name.toLowerCase());
    const isAdded = Boolean(existing) || addedNames.has(name.toLowerCase());
    return (
      <View key={ingredientId ?? `custom:${name}`} style={styles.row}>
        <View style={styles.rowCopy}>
          <AppText style={styles.rowName} numberOfLines={1}>{name}</AppText>
          <AppText style={styles.rowCategory}>{category}</AppText>
        </View>
        {isAdded && existing ? <AppText style={styles.addedLabel}>Added</AppText> : null}
        <Pressable
          onPress={() => existing ? onEdit(existing) : add(name, ingredientId, category)}
          disabled={Boolean(pendingName) || (isAdded && !existing)}
          style={[styles.rowButton, !isAdded && styles.rowButtonPrimary]}
          accessibilityRole="button"
          accessibilityLabel={`${existing ? "Edit" : "Add"} ${name}`}
        >
          {pendingName === name.toLowerCase() ? <ActivityIndicator size="small" color="#FAFAFA" /> : (
            <AppText style={[styles.rowButtonText, !isAdded && styles.rowButtonPrimaryText]}>{existing ? "Edit" : "Add"}</AppText>
          )}
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.sheet}>
      <AppText style={styles.title}>Add items</AppText>
      <AppText style={styles.subtitle}>{listName} · Edit quantity or category after adding.</AppText>
      <AppText style={styles.searchLabel}>Search ingredients</AppText>
      <TextInput
        value={search}
        onChangeText={(value) => { setSearch(value); setConfirmation(""); }}
        placeholder="Try rice, tomatoes or chicken"
        placeholderTextColor={theme.colors.textMuted}
        style={styles.searchInput}
        returnKeyType="done"
        onSubmitEditing={() => add(search)}
      />
      {confirmation ? <View style={styles.confirmation}><Icon name="check" size={13} color={theme.colors.navy3} /><AppText style={styles.confirmationText}>{confirmation}</AppText></View> : null}
      <ScrollView
        style={styles.results}
        contentContainerStyle={styles.resultsContent}
        keyboardDismissMode="interactive"
        keyboardShouldPersistTaps="handled"
        nestedScrollEnabled
        showsVerticalScrollIndicator={false}
      >
        <AppText style={styles.resultsLabel}>{query ? "Results" : "Suggested"}</AppText>
        {query && !exactMatch ? row(search.trim(), "Custom item") : null}
        {ingredientsQuery.isLoading ? <ActivityIndicator color={theme.colors.navy3} style={styles.loading} /> : displayed.map((ingredient) => row(ingredient.displayName, ingredient.categoryName ?? "Pantry", ingredient.id))}
        {!ingredientsQuery.isLoading && !displayed.length && (!query || exactMatch) ? <AppText style={styles.empty}>No matching ingredients.</AppText> : null}
      </ScrollView>
      <Pressable onPress={closeSheet} style={styles.done}><AppText style={styles.doneText}>Done</AppText></Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  sheet: { paddingBottom: 18, minHeight: 0, flexShrink: 1 },
  title: { fontFamily: theme.fontFamily.display, fontSize: 20, color: theme.colors.navy, marginBottom: 3 },
  subtitle: { fontFamily: theme.fontFamily.body, fontSize: 13, color: theme.colors.textMedium, marginBottom: 15 },
  searchLabel: { fontFamily: theme.fontFamily.bodyBold, fontSize: 12, color: theme.colors.navy, marginBottom: 7 },
  searchInput: { minHeight: 48, borderRadius: 12, borderWidth: 1, borderColor: theme.colors.border, backgroundColor: theme.colors.card2, paddingHorizontal: 14, fontFamily: theme.fontFamily.body, fontSize: 14.5, color: theme.colors.navy, marginBottom: 9 },
  confirmation: { flexDirection: "row", alignItems: "center", gap: 7, backgroundColor: theme.colors.card2, borderRadius: 10, paddingVertical: 9, paddingHorizontal: 11, marginBottom: 9 },
  confirmationText: { fontFamily: theme.fontFamily.bodySemiBold, fontSize: 13, color: theme.colors.navy3 },
  results: { maxHeight: 320, minHeight: 0, flexShrink: 1, marginBottom: 14 },
  resultsContent: { flexGrow: 0 },
  resultsLabel: { fontFamily: theme.fontFamily.bodyBold, fontSize: 12, color: theme.colors.textMedium, marginTop: 4, marginBottom: 7 },
  row: { flexDirection: "row", alignItems: "center", gap: 12, minHeight: 58, marginBottom: 7, paddingHorizontal: 10, borderRadius: 12, backgroundColor: theme.colors.white },
  rowCopy: { flex: 1, minWidth: 0, paddingVertical: 9 },
  rowName: { fontFamily: theme.fontFamily.bodyMedium, fontSize: 14, color: theme.colors.navy },
  rowCategory: { fontFamily: theme.fontFamily.body, fontSize: 11.5, color: theme.colors.textMuted, marginTop: 2 },
  addedLabel: { fontFamily: theme.fontFamily.bodyBold, fontSize: 12, color: theme.colors.navy3 },
  rowButton: { minWidth: 64, minHeight: 40, borderRadius: 999, borderWidth: 1, borderColor: theme.colors.border, alignItems: "center", justifyContent: "center", paddingHorizontal: 13 },
  rowButtonPrimary: { backgroundColor: theme.colors.navy, borderColor: theme.colors.navy },
  rowButtonText: { fontFamily: theme.fontFamily.bodyBold, fontSize: 12.5, color: theme.colors.navy },
  rowButtonPrimaryText: { color: "#FAFAFA" },
  loading: { paddingVertical: 24 },
  empty: { fontFamily: theme.fontFamily.body, fontSize: 13, color: theme.colors.textMuted, textAlign: "center", paddingVertical: 22 },
  done: { minHeight: 48, borderRadius: 999, backgroundColor: theme.colors.navy, alignItems: "center", justifyContent: "center" },
  doneText: { fontFamily: theme.fontFamily.bodyBold, fontSize: 15, color: "#FAFAFA" },
});
