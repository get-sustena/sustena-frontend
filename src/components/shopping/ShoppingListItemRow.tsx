// src/components/shopping/ShoppingListItemRow.tsx

import * as Haptics from "expo-haptics";
import { Pressable, StyleSheet, View } from "react-native";
import { formatNaira } from "../../lib/formatters";
import {
  capitalizeWords,
  formatShoppingQuantity,
} from "../../lib/textFormatters";
import { theme } from "../../theme/theme";
import { ShoppingListItem } from "../../types/shoppingList";
import { AppText } from "../ui/AppText";
import { Icon } from "../ui/Icon";

type Props = {
  item: ShoppingListItem;
  onToggle: (itemId: string) => void;
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
        {item.checked ? (
          <Icon name="check" size={15} color={theme.colors.onDark} strokeWidth={2.6} />
        ) : null}
      </Pressable>

      <View style={styles.info}>
        <AppText
          style={[styles.name, item.checked && styles.nameChecked]}
          numberOfLines={1}
        >
          {capitalizeWords(item.name)}
        </AppText>

        <AppText style={styles.quantity}>
          {formatShoppingQuantity(item.quantity)}
        </AppText>
      </View>

      <AppText style={styles.price}>
        {formatNaira(item.estimatedPrice)}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 7,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.card,
  },
  checkboxChecked: {
    backgroundColor: theme.colors.navy,
    borderWidth: 0,
  },
  info: {
    flex: 1,
    minWidth: 0,
  },
  name: {
    fontFamily: theme.fontFamily.body,
    fontSize: 14,
    color: theme.colors.text,
  },
  nameChecked: {
    color: "#9AA298",
    textDecorationLine: "line-through",
  },
  quantity: {
    fontFamily: theme.fontFamily.mono,
    fontSize: 13,
    color: theme.colors.textMedium,
    marginTop: 2,
  },
  price: {
    fontFamily: theme.fontFamily.monoMedium,
    fontSize: 15,
    color: theme.colors.text,
    flexShrink: 0,
  },
});
