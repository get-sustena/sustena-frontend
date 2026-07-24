// src/components/shopping/ShoppingListSection.tsx

import { StyleSheet, View } from "react-native";
import { theme } from "../../theme/theme";
import { ShoppingListItem } from "../../types/shoppingList";
import { AppText } from "../ui/AppText";
import { ShoppingListItemRow } from "./ShoppingListItemRow";

type Props = {
  category: string;
  items: ShoppingListItem[];
  onToggleItem: (itemId: string) => void;
};

export function ShoppingListSection({
  category,
  items,
  onToggleItem,
}: Props) {
  return (
    <View style={styles.section}>
      <AppText style={styles.title}>{category}</AppText>

      {items.map((item) => (
        <ShoppingListItemRow
          key={item.id}
          item={item}
          onToggle={onToggleItem}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginBottom: 16,
  },
  title: {
    fontFamily: theme.fontFamily.mono,
    fontSize: 12,
    color: theme.colors.textMuted,
    letterSpacing: 0,
    textTransform: "uppercase",
    marginBottom: 6,
  },
});
