// src/components/shopping/ShoppingListSection.tsx

import { StyleSheet, View } from "react-native";
import { getCategoryEmoji } from "../../lib/groupShoppingListItems";
import { theme } from "../../theme/theme";
import { ShoppingListItem } from "../../types/shoppingList";
import { AppText } from "../ui/AppText";
import { ShoppingListItemRow } from "./ShoppingListItemRow";

type Props = {
  category: string;
  items: ShoppingListItem[];
  onToggleItem: (itemId: string) => void;
};

export function ShoppingListSection({ category, items, onToggleItem }: Props) {
  return (
    <View style={styles.section}>
      <AppText style={styles.title}>
        {getCategoryEmoji(category)} {category}
      </AppText>

      <View style={styles.card}>
        {items.map((item) => (
          <ShoppingListItemRow
            key={item.id}
            item={item}
            onToggle={onToggleItem}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginHorizontal: 20,
    marginBottom: theme.spacing.xl,
  },
  title: {
    fontFamily: theme.fontFamily.bodyBold,
    fontSize: 10,
    color: theme.colors.textMuted,
    letterSpacing: 1.5,
    textTransform: "uppercase",
    marginBottom: theme.spacing.sm,
  },
  card: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.lg,
    paddingHorizontal: theme.spacing.md,
  },
});
