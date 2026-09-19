// src/components/shopping/ShoppingListItemRow.tsx

import * as Haptics from "expo-haptics";
import { Pressable, StyleSheet, View } from "react-native";
import {
  capitalizeWords,
  formatShoppingQuantity,
} from "../../lib/textFormatters";
import { usePreferencesStore } from "../../store/preferencesStore";
import { theme } from "../../theme/theme";
import { ShoppingListItem } from "../../types/shoppingList";
import { IngredientImage } from "../ingredient/IngredientImage";
import { AppText } from "../ui/AppText";
import { Icon } from "../ui/Icon";

type Props = {
  item: ShoppingListItem;
  onToggle: (itemId: string) => void;
  onMenu?: (item: ShoppingListItem) => void;
};

export function ShoppingListItemRow({ item, onToggle, onMenu }: Props) {
  const hapticsEnabled = usePreferencesStore((state) => state.hapticsEnabled);

  function handleToggle() {
    if (hapticsEnabled) {
      void Haptics.selectionAsync();
    }
    onToggle(item.id);
  }

  return (
    <View style={styles.row}>
      <Pressable
        onPress={handleToggle}
        style={styles.checkboxButton}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: item.checked }}
        accessibilityLabel={`${item.name}, ${item.checked ? "already in your pantry" : "still needed"}`}
      >
        <View style={[styles.checkbox, item.checked && styles.checkboxChecked]}>
          {item.checked ? (
            <Icon name="check" size={15} color={theme.colors.onDark} strokeWidth={2.6} />
          ) : null}
        </View>
      </Pressable>

      <IngredientImage
        ingredientId={item.ingredientId}
        name={item.name}
        size={40}
        style={item.checked ? styles.imageChecked : undefined}
      />

      <View style={styles.info}>
        <AppText style={[styles.name, item.checked && styles.nameChecked]} numberOfLines={2}>
          {capitalizeWords(item.name)}
        </AppText>

        <AppText style={[styles.quantity, item.checked && styles.quantityChecked]}>
          {formatShoppingQuantity(item.quantity)}
        </AppText>
      </View>

      {onMenu ? (
        <Pressable
          onPress={() => onMenu(item)}
          style={styles.menuButton}
          accessibilityRole="button"
          accessibilityLabel={`Edit or remove ${item.name}`}
        >
          <Icon name="moreH" size={17} color={theme.colors.textMuted} />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    minHeight: 76,
    paddingLeft: 9,
    paddingRight: 4,
  },
  checkboxButton: { width: 44, height: 44, marginLeft: -9, alignItems: "center", justifyContent: "center" },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 7,
    borderWidth: 1.7,
    borderColor: "#909090",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.white,
  },
  checkboxChecked: {
    backgroundColor: theme.colors.navy3,
    borderWidth: 0,
  },
  imageChecked: {
    opacity: 0.48,
  },
  info: {
    flex: 1,
    minWidth: 0,
    paddingVertical: 10,
  },
  name: {
    fontFamily: theme.fontFamily.bodySemiBold,
    fontSize: 14.5,
    lineHeight: 18.5,
    color: theme.colors.navy,
  },
  nameChecked: {
    color: theme.colors.textMuted,
  },
  quantity: {
    fontFamily: theme.fontFamily.bodyBold,
    fontSize: 12.5,
    color: theme.colors.navy,
    marginTop: 3,
  },
  quantityChecked: { color: theme.colors.textMuted },
  menuButton: {
    width: 44,
    height: 44,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
});
