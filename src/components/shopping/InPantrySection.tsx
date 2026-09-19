import { Pressable, StyleSheet, View } from "react-native";
import { theme } from "../../theme/theme";
import type { ShoppingListItem } from "../../types/shoppingList";
import { AppText } from "../ui/AppText";
import { Icon } from "../ui/Icon";
import { ShoppingListItemRow } from "./ShoppingListItemRow";

type Props = {
  items: ShoppingListItem[];
  expanded: boolean;
  onToggleExpanded: () => void;
  onToggleItem: (itemId: string) => void;
  onItemMenu: (item: ShoppingListItem) => void;
};

export function InPantrySection({
  items,
  expanded,
  onToggleExpanded,
  onToggleItem,
  onItemMenu,
}: Props) {
  if (!items.length) return null;

  return (
    <View>
      <Pressable
        onPress={onToggleExpanded}
        style={styles.toggle}
        accessibilityRole="button"
        accessibilityState={{ expanded }}
      >
        <View style={styles.heading}>
          <View style={styles.check}>
            <Icon name="check" size={13} color={theme.colors.onDark} />
          </View>
          <AppText style={styles.title}>In pantry</AppText>
          <AppText style={styles.count}>{items.length}</AppText>
        </View>
        <View style={{ transform: [{ rotate: expanded ? "90deg" : "0deg" }] }}>
          <Icon name="chevronRight" size={17} color={theme.colors.textMuted} />
        </View>
      </Pressable>
      {expanded ? (
        <View>
          {items.map((item) => (
            <ShoppingListItemRow
              key={item.id}
              item={item}
              onToggle={onToggleItem}
              onMenu={onItemMenu}
            />
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  toggle: { minHeight: 48, marginTop: 13, paddingHorizontal: 12, borderRadius: 13, backgroundColor: theme.colors.card2, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  heading: { flexDirection: "row", alignItems: "center", gap: 8 },
  check: { width: 24, height: 24, borderRadius: 7, backgroundColor: theme.colors.linkGreen, alignItems: "center", justifyContent: "center" },
  title: { fontFamily: theme.fontFamily.display, fontSize: 15, color: theme.colors.text },
  count: { fontFamily: theme.fontFamily.body, fontSize: 12.5, color: theme.colors.textMedium },
});
