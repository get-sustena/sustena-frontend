import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, TextInput, View } from "react-native";
import { SHOPPING_CATEGORY_LABELS } from "../../lib/groupShoppingListItems";
import { theme } from "../../theme/theme";
import type { ShoppingListItem } from "../../types/shoppingList";
import { AppText } from "../ui/AppText";

type Update = Pick<ShoppingListItem, "name" | "quantity" | "unit" | "category">;

export function ShoppingListItemEditSheet({
  item,
  onSave,
  onRemove,
}: {
  item: ShoppingListItem;
  onSave: (update: Update) => Promise<void>;
  onRemove: () => Promise<void>;
}) {
  const [name, setName] = useState(item.name);
  const [quantity, setQuantity] = useState(() => item.amount != null ? String(item.amount) : item.quantity.match(/^([\d.,/¼½¾⅓⅔]+)/u)?.[1] ?? "1");
  const [unit, setUnit] = useState(() => item.unit ?? item.quantity.replace(/^[\d.,/¼½¾⅓⅔]+\s*/u, ""));
  const [category, setCategory] = useState(() => normalizeCategory(item.category));
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!name.trim() || saving) return;
    setSaving(true);
    try {
      await onSave({
        name: name.trim(),
        quantity: quantity.trim(),
        unit: unit.trim() || undefined,
        category,
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <ScrollView
      style={styles.sheet}
      contentContainerStyle={styles.sheetContent}
      keyboardDismissMode="interactive"
      keyboardShouldPersistTaps="handled"
      nestedScrollEnabled
      showsVerticalScrollIndicator={false}
    >
      <AppText style={styles.title}>Edit item</AppText>
      <AppText style={styles.label}>Ingredient</AppText>
      <TextInput value={name} onChangeText={setName} style={styles.input} />
      <View style={styles.row}>
        <View style={styles.field}>
          <AppText style={styles.label}>Quantity</AppText>
          <TextInput
            value={quantity}
            onChangeText={setQuantity}
            style={styles.input}
            keyboardType="decimal-pad"
          />
        </View>
        <View style={styles.field}>
          <AppText style={styles.label}>Unit</AppText>
          <TextInput value={unit} onChangeText={setUnit} style={styles.input} />
        </View>
      </View>
      <AppText style={styles.label}>Category</AppText>
      <View style={styles.categories}>
        {Object.entries(SHOPPING_CATEGORY_LABELS).map(([value, label]) => (
          <Pressable
            key={value}
            onPress={() => setCategory(value)}
            style={[styles.category, category === value && styles.categorySelected]}
          >
            <AppText style={[styles.categoryText, category === value && styles.categoryTextSelected]}>
              {label}
            </AppText>
          </Pressable>
        ))}
      </View>
      <View style={styles.actions}>
        <Pressable onPress={onRemove} style={styles.removeButton}>
          <AppText style={styles.removeText}>Remove</AppText>
        </Pressable>
        <Pressable onPress={save} disabled={!name.trim() || saving} style={styles.saveButton}>
          <AppText style={styles.saveText}>{saving ? "Saving..." : "Save changes"}</AppText>
        </Pressable>
      </View>
    </ScrollView>
  );
}

function normalizeCategory(category: string) {
  const normalized = category.trim().toLowerCase().replace(/[ &-]+/g, "_");
  const aliases: Record<string, string> = {
    pantry: "pantry",
    produce: "produce",
    vegetables: "produce",
    proteins: "meat_seafood",
    grains: "grains_staples",
    spices: "herbs_spices",
    dairy: "dairy_eggs",
  };
  return aliases[normalized] ?? (SHOPPING_CATEGORY_LABELS[normalized] ? normalized : "other");
}

const styles = StyleSheet.create({
  sheet: { minHeight: 0, flexShrink: 1 },
  sheetContent: { paddingBottom: 24 },
  title: { fontFamily: theme.fontFamily.display, fontSize: 19, color: theme.colors.navy, marginBottom: 16 },
  label: { fontFamily: theme.fontFamily.monoMedium, fontSize: 11, color: theme.colors.textMuted, textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 },
  input: { minHeight: 48, borderWidth: 1, borderColor: theme.colors.border, backgroundColor: theme.colors.card2, borderRadius: 12, paddingHorizontal: 13, fontFamily: theme.fontFamily.body, fontSize: 14.5, color: theme.colors.navy, marginBottom: 14 },
  row: { flexDirection: "row", gap: 10 },
  field: { flex: 1 },
  categories: { flexDirection: "row", flexWrap: "wrap", gap: 7 },
  category: { borderWidth: 1, borderColor: theme.colors.border, borderRadius: 999, paddingHorizontal: 13, paddingVertical: 9 },
  categorySelected: { backgroundColor: theme.colors.navy, borderColor: theme.colors.navy },
  categoryText: { fontFamily: theme.fontFamily.bodyMedium, fontSize: 12, color: theme.colors.text },
  categoryTextSelected: { color: theme.colors.onDark },
  actions: { flexDirection: "row", gap: 10, marginTop: 22 },
  removeButton: { minHeight: 48, borderRadius: 999, borderWidth: 1, borderColor: theme.colors.red, backgroundColor: "#FCEDEC", paddingHorizontal: 18, alignItems: "center", justifyContent: "center" },
  removeText: { fontFamily: theme.fontFamily.bodySemiBold, fontSize: 14.5, color: theme.colors.red },
  saveButton: { flex: 1, minHeight: 48, borderRadius: 999, backgroundColor: theme.colors.navy, alignItems: "center", justifyContent: "center" },
  saveText: { fontFamily: theme.fontFamily.bodyBold, fontSize: 14, color: theme.colors.onDark },
});
