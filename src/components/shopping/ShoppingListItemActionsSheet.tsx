import { Pressable, StyleSheet, View } from "react-native";
import { theme } from "../../theme/theme";
import type { ShoppingListItem } from "../../types/shoppingList";
import { AppText } from "../ui/AppText";
import { Icon } from "../ui/Icon";

export function ShoppingListItemActionsSheet({
  item,
  onEdit,
  onRemove,
}: {
  item: ShoppingListItem;
  onEdit: () => void;
  onRemove: () => void;
}) {
  return (
    <View style={styles.sheet}>
      <AppText style={styles.title} numberOfLines={1}>{item.name}</AppText>
      <Pressable onPress={onEdit} style={styles.row}>
        <Icon name="pencil" size={18} color={theme.colors.text} />
        <AppText style={styles.text}>Edit item</AppText>
      </Pressable>
      <Pressable onPress={onRemove} style={styles.row}>
        <Icon name="trash" size={18} color={theme.colors.red} />
        <AppText style={styles.danger}>Remove item</AppText>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  sheet: { paddingBottom: 24 },
  title: { fontFamily: theme.fontFamily.display, fontSize: 19, color: theme.colors.text, marginBottom: 10 },
  row: { flexDirection: "row", alignItems: "center", gap: 12, minHeight: 54, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  text: { fontFamily: theme.fontFamily.bodyMedium, fontSize: 14, color: theme.colors.text },
  danger: { fontFamily: theme.fontFamily.bodyMedium, fontSize: 14, color: theme.colors.red },
});
