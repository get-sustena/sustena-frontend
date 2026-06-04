// src/components/shopping/ShoppingListItemRow.tsx

import * as Haptics from "expo-haptics";
import { Pressable, StyleSheet, View } from "react-native";
import { formatNaira } from "../../lib/formatters";
import { theme } from "../../theme/theme";
import { ShoppingListItem } from "../../types/shoppingList";
import { AppText } from "../ui/AppText";

type Props = {
  item: ShoppingListItem;
  onToggle: (itemId: string) => void;
  onRemove?: (itemId: string) => void;
};

export function ShoppingListItemRow({ item, onToggle }: Props) {
  function handleToggle() {
    Haptics.selectionAsync();
    onToggle(item.id);
  }

  return (
    <View style={styles.row}>
      <Pressable
        onPress={handleToggle}
        style={[styles.checkbox, item.checked && styles.checkboxChecked]}
      >
        {item.checked ? <AppText style={styles.checkmark}>✓</AppText> : null}
      </Pressable>

      <AppText style={styles.emoji}>{item.emoji}</AppText>

      <View style={styles.info}>
        <AppText
          style={[styles.name, item.checked && styles.nameChecked]}
          numberOfLines={1}
        >
          {item.name}
        </AppText>

        <AppText style={styles.quantity}>{item.quantity}</AppText>
      </View>

      <AppText style={styles.price}>{formatNaira(item.estimatedPrice)}</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.md,
    paddingVertical: 13,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: theme.colors.border2,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.surface,
  },
  checkboxChecked: {
    backgroundColor: theme.colors.green,
    borderColor: theme.colors.green,
  },
  checkmark: {
    fontFamily: theme.fontFamily.bodyBold,
    fontSize: 13,
    color: theme.colors.white,
  },
  emoji: {
    fontSize: 22,
  },
  info: {
    flex: 1,
  },
  name: {
    fontFamily: theme.fontFamily.bodyBold,
    fontSize: 14,
    color: theme.colors.navy,
  },
  nameChecked: {
    color: theme.colors.textDim,
    textDecorationLine: "line-through",
  },
  quantity: {
    fontFamily: theme.fontFamily.body,
    fontSize: 11,
    color: theme.colors.textMuted,
    marginTop: 2,
  },
  price: {
    fontFamily: theme.fontFamily.bodyBold,
    fontSize: 12,
    color: theme.colors.textMedium,
  },
});
