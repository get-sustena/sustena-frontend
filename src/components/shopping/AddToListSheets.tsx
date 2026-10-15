import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { theme } from "../../theme/theme";
import { AppText } from "../ui/AppText";
import { Icon } from "../ui/Icon";

// Adding a recipe's or a plan's ingredients to a shopping list (SL-06,
// prototype openDestinationSheet and renderMergeReview): pick the list,
// then review what lands on it.

export function ChooseListSheet({
  title,
  lists,
  onChoose,
  onNewList,
}: {
  title: string;
  lists: { id: string; name: string; summary: string }[];
  onChoose: (listId: string) => void;
  onNewList: () => void;
}) {
  return (
    <View style={styles.sheet}>
      <AppText style={styles.chooseTitle}>Add ingredients to…</AppText>
      <AppText style={styles.chooseCopy}>Choose a shopping list for {title}.</AppText>
      <ScrollView style={styles.listScroll} contentContainerStyle={styles.listScrollContent}>
        {lists.length ? (
          lists.map((list) => (
            <Pressable
              key={list.id}
              onPress={() => onChoose(list.id)}
              style={({ pressed }) => [styles.listRow, pressed && styles.pressed]}
              accessibilityRole="button"
              accessibilityLabel={`${list.name}, ${list.summary}`}
            >
              <View style={styles.listIcon}>
                <Icon name="shop" size={18} color={theme.colors.textMutedAlt} />
              </View>
              <View style={styles.listInfo}>
                <AppText style={styles.listName} numberOfLines={1}>
                  {list.name}
                </AppText>
                <AppText style={styles.listSummary}>{list.summary}</AppText>
              </View>
              <Icon name="chevronRight" size={17} color={theme.colors.textMuted} />
            </Pressable>
          ))
        ) : (
          <AppText style={styles.emptyCopy}>No lists yet.</AppText>
        )}
      </ScrollView>
      <Pressable
        onPress={onNewList}
        style={({ pressed }) => [styles.newListButton, pressed && styles.pressed]}
        accessibilityRole="button"
      >
        <Icon name="plus" size={15} color={theme.colors.text} />
        <AppText style={styles.newListText}>New shopping list</AppText>
      </Pressable>
    </View>
  );
}

type ReviewRow = {
  key: string;
  name: string;
  recipeNeeds: string | null;
  alreadyListed: boolean;
  listQuantity: string;
};

export function ReviewQuantitiesSheet({
  listName,
  rows,
  inPantryNames,
  onBack,
  onConfirm,
}: {
  listName: string;
  rows: ReviewRow[];
  inPantryNames: string[];
  onBack: () => void;
  onConfirm: () => void;
}) {
  return (
    <View style={styles.sheet}>
      <View style={styles.reviewHeader}>
        <Pressable onPress={onBack} style={styles.backButton} accessibilityRole="button" accessibilityLabel="Back to shopping lists">
          <Icon name="chevronLeft" size={18} color={theme.colors.text} />
        </Pressable>
        <View style={styles.reviewHeading}>
          <AppText style={styles.reviewTitle}>Review shopping quantities</AppText>
          <AppText style={styles.reviewListName} numberOfLines={1}>
            {listName}
          </AppText>
        </View>
      </View>

      <ScrollView style={styles.reviewScroll}>
        <View style={styles.retailNote}>
          <View style={styles.retailIcon}>
            <Icon name="shop" size={15} color={theme.colors.navy3} />
          </View>
          <AppText style={styles.retailText}>
            The shopping list uses standard shopping quantities so final price estimates may differ.
          </AppText>
        </View>

        <View style={styles.reviewList}>
          {rows.length ? (
            rows.map((row) => (
              <View key={row.key} style={styles.reviewRow}>
                <View style={styles.reviewInfo}>
                  <AppText style={styles.reviewName}>{row.name}</AppText>
                  {row.recipeNeeds || row.alreadyListed ? (
                    <AppText style={styles.reviewMeta}>
                      {[row.recipeNeeds ? `Recipe needs ${row.recipeNeeds}` : "", row.alreadyListed ? "Already listed" : ""]
                        .filter(Boolean)
                        .join(" · ")}
                    </AppText>
                  ) : null}
                </View>
                {row.listQuantity ? (
                  <View style={styles.packStatic}>
                    <AppText style={styles.packLabel}>List quantity</AppText>
                    <AppText style={styles.packValue}>{row.listQuantity}</AppText>
                  </View>
                ) : null}
              </View>
            ))
          ) : (
            <AppText style={styles.emptyCopy}>Everything from this recipe is already in your pantry.</AppText>
          )}
        </View>

        {inPantryNames.length ? (
          <AppText style={styles.pantryNote}>
            <AppText style={styles.pantryNoteStrong}>Already in pantry:</AppText> {inPantryNames.join(", ")}. These will not be added.
          </AppText>
        ) : null}
      </ScrollView>

      <View style={styles.reviewAction}>
        <Pressable
          onPress={onConfirm}
          style={({ pressed }) => [styles.confirmButton, pressed && styles.pressed]}
          accessibilityRole="button"
        >
          <AppText style={styles.confirmText}>
            {rows.length ? `Add ${rows.length} item${rows.length === 1 ? "" : "s"}` : "Done"}
          </AppText>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  sheet: { paddingBottom: theme.spacing.xl },
  pressed: { opacity: 0.9 },
  chooseTitle: { fontFamily: theme.fontFamily.display, fontSize: 21, color: theme.colors.text, marginBottom: 4 },
  chooseCopy: { fontFamily: theme.fontFamily.body, fontSize: 13, color: theme.colors.textMedium, marginBottom: 16 },
  listScroll: { maxHeight: 330, marginBottom: 10 },
  listScrollContent: { gap: 9 },
  listRow: {
    backgroundColor: theme.colors.page,
    borderWidth: 0.75,
    borderColor: theme.colors.border,
    borderRadius: 14,
    paddingVertical: 13,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  listIcon: {
    width: 38,
    height: 38,
    borderRadius: 11,
    backgroundColor: theme.colors.cream2,
    alignItems: "center",
    justifyContent: "center",
  },
  listInfo: { flex: 1, minWidth: 0 },
  listName: { fontFamily: theme.fontFamily.display, fontSize: 14.5, color: theme.colors.text },
  listSummary: { fontFamily: theme.fontFamily.body, fontSize: 12, color: theme.colors.textMedium, marginTop: 2 },
  emptyCopy: { fontFamily: theme.fontFamily.body, fontSize: 13, color: theme.colors.textMuted, textAlign: "center", padding: 20 },
  newListButton: {
    borderWidth: 0.75,
    borderColor: theme.colors.border,
    borderRadius: 999,
    paddingVertical: 13,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  newListText: { fontFamily: theme.fontFamily.bodyBold, fontSize: 14, color: theme.colors.text },
  reviewHeader: { flexDirection: "row", alignItems: "center", gap: 9, marginBottom: 3 },
  backButton: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  reviewHeading: { flex: 1, minWidth: 0 },
  reviewTitle: { fontFamily: theme.fontFamily.display, fontSize: 20, color: theme.colors.text },
  reviewListName: { fontFamily: theme.fontFamily.body, fontSize: 12.5, color: theme.colors.textMedium, marginTop: 2 },
  reviewScroll: { maxHeight: 320, marginTop: 14 },
  retailNote: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    marginVertical: 14,
    padding: 12,
    borderRadius: 13,
    backgroundColor: theme.colors.cream2,
  },
  retailIcon: {
    width: 30,
    height: 30,
    borderRadius: 9,
    backgroundColor: theme.colors.page,
    alignItems: "center",
    justifyContent: "center",
  },
  retailText: { flex: 1, fontFamily: theme.fontFamily.body, fontSize: 12.5, lineHeight: 18, color: theme.colors.text },
  reviewList: { marginBottom: 16, gap: 7 },
  reviewRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    minHeight: 70,
    paddingVertical: 11,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: theme.colors.page,
  },
  reviewInfo: { flex: 1, minWidth: 0 },
  reviewName: { fontFamily: theme.fontFamily.bodySemiBold, fontSize: 14, lineHeight: 18, color: theme.colors.text },
  reviewMeta: { fontFamily: theme.fontFamily.body, fontSize: 11.5, lineHeight: 15.5, color: theme.colors.textMedium, marginTop: 3 },
  packStatic: { minWidth: 104, maxWidth: "46%", alignItems: "flex-end" },
  packLabel: { fontFamily: theme.fontFamily.bodySemiBold, fontSize: 10.5, color: theme.colors.textMuted, marginBottom: 2 },
  packValue: { fontFamily: theme.fontFamily.bodyBold, fontSize: 12, lineHeight: 15.5, color: theme.colors.text, textAlign: "right" },
  pantryNote: {
    fontFamily: theme.fontFamily.body,
    fontSize: 12,
    lineHeight: 17.5,
    color: theme.colors.textMedium,
    backgroundColor: theme.colors.cream2,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 14,
  },
  pantryNoteStrong: { fontFamily: theme.fontFamily.bodySemiBold, color: theme.colors.text },
  reviewAction: { paddingTop: 12 },
  confirmButton: { backgroundColor: theme.colors.text, borderRadius: 999, paddingVertical: 14, alignItems: "center" },
  confirmText: { fontFamily: theme.fontFamily.bodyBold, fontSize: 15, color: theme.colors.page },
});
