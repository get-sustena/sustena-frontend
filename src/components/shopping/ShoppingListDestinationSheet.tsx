import { Pressable, StyleSheet, View } from "react-native";
import { theme } from "../../theme/theme";
import type { ShoppingListMeta } from "../../types/shoppingList";
import { AppText } from "../ui/AppText";
import { Icon } from "../ui/Icon";

export function ShoppingListDestinationSheet({
  lists,
  activeListId,
  onSelect,
}: {
  lists: ShoppingListMeta[];
  activeListId: string;
  onSelect: (listId: string) => void;
}) {
  return (
    <View style={styles.sheet}>
      <AppText style={styles.title}>Choose a shopping list</AppText>
      <AppText style={styles.copy}>Select where these ingredients should go.</AppText>
      {lists.map((list) => (
        <Pressable key={list.id} onPress={() => onSelect(list.id)} style={styles.row}>
          <View style={styles.info}>
            <AppText style={styles.name}>{list.name}</AppText>
            {list.id === activeListId ? <AppText style={styles.current}>Current list</AppText> : null}
          </View>
          <Icon name="chevronRight" size={17} color={theme.colors.textMuted} />
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  sheet: { paddingBottom: 24 },
  title: { fontFamily: theme.fontFamily.display, fontSize: 20, color: theme.colors.text },
  copy: { fontFamily: theme.fontFamily.body, fontSize: 13.5, color: theme.colors.textMedium, marginTop: 5, marginBottom: 12 },
  row: { minHeight: 60, flexDirection: "row", alignItems: "center", borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  info: { flex: 1 },
  name: { fontFamily: theme.fontFamily.bodySemiBold, fontSize: 14, color: theme.colors.text },
  current: { fontFamily: theme.fontFamily.mono, fontSize: 11.5, color: theme.colors.goldText, marginTop: 2 },
});
