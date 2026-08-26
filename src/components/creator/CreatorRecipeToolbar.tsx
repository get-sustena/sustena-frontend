import { Pressable, StyleSheet, View } from "react-native";
import { theme } from "../../theme/theme";
import { AppText } from "../ui/AppText";
import { Icon } from "../ui/Icon";
import type { CreatorRecipeSort } from "./SortCreatorRecipesSheet";

export function CreatorRecipeToolbar({
  title,
  count,
  sort,
  showSort,
  onOpenSort,
}: {
  title: string;
  count: number;
  sort: CreatorRecipeSort;
  showSort: boolean;
  onOpenSort: () => void;
}) {
  return (
    <View style={styles.toolbar}>
      <View style={styles.titleRow}>
        <AppText numberOfLines={1} style={styles.title}>
          {title}
        </AppText>
        <AppText style={styles.count}>{count}</AppText>
      </View>

      {showSort ? (
        <Pressable
          accessibilityLabel="Sort recipes"
          onPress={onOpenSort}
          style={styles.sortButton}
        >
          <AppText style={styles.sortText}>
            {sort === "top_rated" ? "Top rated" : "Newest"}
          </AppText>
          <Icon name="chevronDown" size={13} color="#8a9187" />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  toolbar: {
    width: "100%",
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 10,
    flexDirection: "row",
    flexWrap: "nowrap",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    backgroundColor: "#FBFCFA",
    zIndex: 2,
  },
  titleRow: {
    flex: 1,
    minWidth: 0,
    flexDirection: "row",
    flexWrap: "nowrap",
    alignItems: "center",
    gap: 5,
  },
  title: {
    flexShrink: 1,
    fontFamily: theme.fontFamily.bodySemiBold,
    fontSize: 15,
    color: "#17291E",
  },
  count: {
    flexShrink: 0,
    fontFamily: theme.fontFamily.monoBold,
    fontSize: 12,
    color: "#8a9187",
  },
  sortButton: {
    flexShrink: 0,
    minHeight: 38,
    paddingHorizontal: 13,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#D8E3CA",
    backgroundColor: "#FFFFFF",
  },
  sortText: {
    fontFamily: theme.fontFamily.bodySemiBold,
    fontSize: 12.5,
    color: "#17291E",
  },
});
