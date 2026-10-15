import { router, useFocusEffect } from "expo-router";
import { Image } from "expo-image";
import { useSQLiteContext } from "expo-sqlite";
import { useCallback, useEffect, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AppText } from "../../src/components/ui/AppText";
import { appImages } from "../../src/assets/appImages";
import { Icon } from "../../src/components/ui/Icon";
import { replaceListsKeepingPendingEdits } from "../../src/db/shoppingListRows";
import {
  getShoppingListItemSummaries,
  replaceShoppingListItemsForList,
} from "../../src/db/shoppingListRepository";
import { getStoredShoppingLists, mapShoppingListRowToMeta } from "../../src/db/shoppingListsRepository";
import { runWriteTransaction } from "../../src/db/writeTransaction";
import { useListCommands } from "../../src/hooks/useListCommands";
import { useIsOnline } from "../../src/hooks/useIsOnline";
import { shoppingListsApi } from "../../src/lib/api";
import { apiShoppingItemToLocalItem } from "../../src/lib/api/adapters";
import { onSyncFinished } from "../../src/lib/sync/syncEvents";
import { useShoppingListsStore } from "../../src/store/shoppingListsStore";
import { closeSheet, openSheet, showToast } from "../../src/store/uiStore";
import { theme } from "../../src/theme/theme";
import { ShoppingListMeta } from "../../src/types/shoppingList";
import { TAB_BAR_CLEARANCE } from "../../src/components/layout/tabBarClearance";

type ListSummary = {
  itemCount: number;
  checkedCount: number;
};

export default function ShoppingListsScreen() {
  const insets = useSafeAreaInsets();
  const db = useSQLiteContext();
  const isOnline = useIsOnline();
  const lists = useShoppingListsStore((state) => state.lists);
  const addList = useShoppingListsStore((state) => state.addList);
  const renameListInStore = useShoppingListsStore((state) => state.renameList);
  const hydrateLists = useShoppingListsStore((state) => state.hydrateLists);
  const listCommands = useListCommands();
  const [summaries, setSummaries] = useState<Record<string, ListSummary>>({});

  const loadSummaries = useCallback(async () => {
    const rows = await getShoppingListItemSummaries(db);
    const next: Record<string, ListSummary> = {};

    for (const row of rows) {
      next[row.list_id] = {
        itemCount: row.item_count,
        checkedCount: row.checked_count,
      };
    }

    setSummaries(next);
  }, [db]);

  const syncListsFromServer = useCallback(async () => {
    if (!isOnline) return;

    try {
      const requestedAt = Date.now();
      const serverLists = await shoppingListsApi.getShoppingLists();
      // Lists made, renamed or deleted on the phone and not sent yet stay
      // as the phone has them (QAD-01).
      const shown = await runWriteTransaction(db, (tx) =>
        replaceListsKeepingPendingEdits(
          tx,
          serverLists.map((list) => ({
            id: list.id,
            name: list.name,
            isDefaultSyncedList: list.isActive,
            createdAt: list.createdAt,
            updatedAt: list.updatedAt,
          }))
        )
      );

      for (const serverList of serverLists) {
        if (!shown.some((list) => list.id === serverList.id)) continue;
        await replaceShoppingListItemsForList(
          db,
          serverList.id,
          serverList.items.map((item) => ({
            ...apiShoppingItemToLocalItem(item),
            listId: serverList.id,
          })),
          { requestedAt }
        );
      }

      hydrateLists(shown);
      await loadSummaries();
    } catch (error) {
      console.error("Failed to sync shopping lists from server", error);
    }
  }, [db, hydrateLists, isOnline, loadSummaries]);

  useFocusEffect(
    useCallback(() => {
      loadSummaries();
      syncListsFromServer();
    }, [loadSummaries, syncListsFromServer])
  );

  // Sent changes can give a new list the server's id, or bring back a list
  // whose delete was refused.
  useEffect(
    () =>
      onSyncFinished(() => {
        void getStoredShoppingLists(db).then((rows) => hydrateLists(rows.map(mapShoppingListRowToMeta)));
        void loadSummaries();
      }),
    [db, hydrateLists, loadSummaries]
  );

  async function handleCreateList(name: string) {
    const trimmed = name.trim();
    if (!trimmed) return;

    // Saved on the phone at once, and sent when there's a connection.
    const list = await listCommands.createList({ name: trimmed });
    addList(list);
    closeSheet();
    router.push({ pathname: "/shopping/[id]", params: { id: list.id } });
  }

  function openCreateSheet() {
    openSheet(<CreateListSheet defaultName={`Shopping List #${lists.length + 1}`} onCreate={handleCreateList} />);
  }

  async function handleRenameList(list: ShoppingListMeta, name: string) {
    const trimmed = name.trim();
    if (!trimmed) return;

    await listCommands.renameList({ listId: list.id, name: trimmed });
    renameListInStore(list.id, trimmed);
    closeSheet();
    showToast("List renamed", "success");
  }

  async function handleDeleteList(list: ShoppingListMeta) {
    await listCommands.deleteList({ listId: list.id });
    // Read back from the phone, which also knows the new active list.
    hydrateLists((await getStoredShoppingLists(db)).map(mapShoppingListRowToMeta));
    closeSheet();
    showToast("Shopping list deleted", "success");
  }

  function openListOptionsSheet(list: ShoppingListMeta) {
    openSheet(
      <ListOptionsSheet
        list={list}
        onRename={(name) => handleRenameList(list, name)}
        onDelete={() => handleDeleteList(list)}
        onShare={() => {
          closeSheet();
          router.push({ pathname: "/shopping/[id]", params: { id: list.id, share: "1" } });
        }}
      />
    );
  }

  return (
    <Animated.View entering={FadeInDown.duration(320)} style={styles.screen}>
      <View
        style={[styles.header, { paddingTop: Math.max(52, insets.top + 5) }]}
      >
        <AppText style={styles.title}>Shopping lists</AppText>

        <Pressable
          onPress={openCreateSheet}
          style={({ pressed }) => [
            styles.newListButton,
            pressed && styles.pressed,
          ]}
        >
          <Icon name="plus" size={17} color={theme.colors.onDark} />
          <AppText style={styles.newListButtonText}>New list</AppText>
        </Pressable>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {lists.length === 0 ? (
          <View style={styles.empty}>
            <Image
              source={appImages.emptyStates.shoppingList}
              contentFit="contain"
              style={styles.emptyImage}
            />

            <AppText style={styles.emptyTitle}>Start a shopping list</AppText>
            <AppText style={styles.emptyText}>
              Use a separate list for each trip, store, or occasion.
            </AppText>

            <Pressable
              onPress={openCreateSheet}
              style={({ pressed }) => [
                styles.emptyButton,
                pressed && styles.pressed,
              ]}
            >
              <Icon name="plus" size={16} color={theme.colors.onDark} />
              <AppText style={styles.emptyButtonText}>Create a list</AppText>
            </Pressable>
          </View>
        ) : (
          <>
            <View style={styles.listOverviewMeta}>
              <AppText style={styles.listOverviewCount}>
                {lists.length} {lists.length === 1 ? "list" : "lists"}
              </AppText>
              <AppText style={styles.listOverviewOrder}>Most recent first</AppText>
            </View>
            <View style={styles.listGrid}>
            {[...lists].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).map((list) => {
              const summary = summaries[list.id];
              const itemCount = summary?.itemCount ?? 0;
              const checkedCount = summary?.checkedCount ?? 0;
              return (
                <View key={list.id} style={styles.listCard}>
                  <Pressable
                    onPress={() => router.push({ pathname: "/shopping/[id]", params: { id: list.id } })}
                    style={({ pressed }) => [styles.listMain, pressed && styles.pressed]}
                    accessibilityRole="button"
                    accessibilityLabel={`Open ${list.name}`}
                  >
                    <View style={styles.listInfo}>
                      <AppText style={styles.listName} numberOfLines={1}>
                        {list.name}
                      </AppText>
                      <View style={styles.listMetaRow}>
                        <AppText style={styles.listMetaCount}>{itemCount} {itemCount === 1 ? "item" : "items"}</AppText>
                        {itemCount > 0 ? (
                          <>
                            <AppText style={styles.listMeta}>·</AppText>
                            <AppText style={styles.listMeta}>{checkedCount} in pantry</AppText>
                          </>
                        ) : null}
                      </View>
                    </View>
                    <Icon name="chevronRight" size={17} color={theme.colors.textMuted} />
                  </Pressable>
                  <Pressable
                    onPress={() => openListOptionsSheet(list)}
                    hitSlop={8}
                    style={styles.optionsButton}
                    accessibilityRole="button"
                    accessibilityLabel={`Options for ${list.name}`}
                  >
                    <Icon name="moreH" size={18} color={theme.colors.textMuted} />
                  </Pressable>
                </View>
              );
            })}

          </View>
          </>
        )}
      </ScrollView>
    </Animated.View>
  );
}

function CreateListSheet({ defaultName, onCreate }: { defaultName: string; onCreate: (name: string) => void }) {
  const [name, setName] = useState(defaultName);

  return (
    <View style={styles.sheetContent}>
      <AppText style={styles.sheetTitle}>New shopping list</AppText>

      <TextInput
        value={name}
        onChangeText={setName}
        placeholder="e.g. Weekend groceries"
        placeholderTextColor={theme.colors.textDim}
        style={styles.sheetInput}
        autoFocus
        returnKeyType="done"
        onSubmitEditing={() => onCreate(name)}
      />

      <Pressable
        onPress={() => onCreate(name)}
        disabled={!name.trim()}
        style={[
          styles.sheetPrimaryButton,
          !name.trim() && styles.sheetPrimaryButtonDisabled,
        ]}
      >
        <AppText style={styles.sheetPrimaryButtonText}>Create list</AppText>
      </Pressable>
    </View>
  );
}

function ListOptionsSheet({
  list,
  onRename,
  onDelete,
  onShare,
}: {
  list: ShoppingListMeta;
  onRename: (name: string) => void;
  onDelete: () => void;
  onShare: () => void;
}) {
  const [name, setName] = useState(list.name);
  const [isRenaming, setIsRenaming] = useState(false);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);

  if (!isRenaming && !isConfirmingDelete) {
    return (
      <View style={styles.menuSheet}>
        <Pressable onPress={() => setIsRenaming(true)} style={styles.menuRow}><Icon name="pencil" size={19} color={theme.colors.navy} /><AppText style={styles.menuRowText}>Rename list</AppText></Pressable>
        <Pressable onPress={onShare} style={styles.menuRow}><Icon name="share" size={19} color={theme.colors.navy} /><AppText style={styles.menuRowText}>Share as image</AppText></Pressable>
        <Pressable onPress={() => setIsConfirmingDelete(true)} style={styles.menuRow}><Icon name="trash" size={19} color={theme.colors.red} /><AppText style={styles.menuRowDanger}>Delete list</AppText></Pressable>
      </View>
    );
  }

  if (isConfirmingDelete) {
    return (
      <View style={styles.sheetContent}>
        <AppText style={styles.sheetTitle}>Delete “{list.name}”?</AppText>
        <AppText style={styles.sheetCopy}>This will permanently remove the list and its items.</AppText>
        <View style={styles.confirmActions}>
          <Pressable onPress={() => setIsConfirmingDelete(false)} style={styles.cancelButton}><AppText style={styles.cancelText}>Cancel</AppText></Pressable>
          <Pressable onPress={onDelete} style={styles.deleteButton}><AppText style={styles.sheetPrimaryButtonText}>Delete</AppText></Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.sheetContent}>
      <AppText style={styles.sheetTitle}>Rename list</AppText>

      <TextInput
        value={name}
        onChangeText={setName}
        placeholderTextColor={theme.colors.textDim}
        style={styles.sheetInput}
        returnKeyType="done"
        onSubmitEditing={() => onRename(name)}
      />

      <Pressable
        onPress={() => onRename(name)}
        disabled={!name.trim()}
        style={[
          styles.sheetPrimaryButton,
          !name.trim() && styles.sheetPrimaryButtonDisabled,
        ]}
      >
        <AppText style={styles.sheetPrimaryButtonText}>Save</AppText>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#FAFAFA",
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 4,
    paddingBottom: TAB_BAR_CLEARANCE,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 52,
    paddingBottom: 16,
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
  },
  title: {
    fontFamily: theme.fontFamily.display,
    fontSize: 26,
    letterSpacing: -0.39,
    color: theme.colors.navy,
  },
  newListButton: {
    minHeight: 44,
    borderRadius: 999,
    paddingHorizontal: 14,
    flexDirection: "row",
    gap: 7,
    backgroundColor: theme.colors.navy,
    alignItems: "center",
    justifyContent: "center",
  },
  newListButtonText: { fontFamily: theme.fontFamily.bodyBold, fontSize: 13.5, color: theme.colors.onDark },
  empty: {
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 56,
  },
  emptyImage: { width: 138, height: 92, marginBottom: 28 },
  emptyTitle: {
    fontFamily: theme.fontFamily.display,
    fontSize: 18,
    color: theme.colors.text,
    marginBottom: 8,
  },
  emptyText: {
    fontFamily: theme.fontFamily.body,
    fontSize: 14,
    lineHeight: 21,
    color: theme.colors.textMedium,
    textAlign: "center",
    maxWidth: 240,
    marginBottom: 22,
  },
  emptyButton: {
    backgroundColor: theme.colors.navy,
    borderRadius: 999,
    paddingHorizontal: 22,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  emptyButtonText: {
    fontFamily: theme.fontFamily.bodySemiBold,
    fontSize: 14.5,
    color: theme.colors.onDark,
  },
  listGrid: {
    marginHorizontal: 20,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: theme.colors.white,
  },
  listOverviewMeta: {
    marginHorizontal: 20,
    marginBottom: 9,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  listOverviewCount: {
    fontFamily: theme.fontFamily.body,
    fontSize: 12.5,
    color: theme.colors.textMedium,
  },
  listOverviewOrder: {
    fontFamily: theme.fontFamily.body,
    fontSize: 12,
    color: theme.colors.textMuted,
  },
  listCard: {
    backgroundColor: theme.colors.white,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    minHeight: 76,
    flexDirection: "row",
    alignItems: "center",
  },
  pressed: {
    opacity: 0.9,
  },
  listMain: {
    flex: 1,
    minWidth: 0,
    alignSelf: "stretch",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    paddingLeft: 15,
    paddingRight: 8,
    paddingVertical: 14,
  },
  listInfo: {
    flex: 1,
    minWidth: 0,
  },
  listName: {
    fontFamily: theme.fontFamily.display,
    fontSize: 16,
    lineHeight: 21,
    color: theme.colors.text,
  },
  listMetaRow: { flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 7, marginTop: 5 },
  listMetaCount: { fontFamily: theme.fontFamily.bodySemiBold, fontSize: 12.5, color: theme.colors.text },
  listMeta: {
    fontFamily: theme.fontFamily.body,
    fontSize: 12.5,
    color: theme.colors.textMedium,
  },
  optionsButton: {
    width: 44,
    height: 44,
    marginRight: 8,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
  },
  sheetContent: {
    paddingBottom: theme.spacing.xl,
    gap: theme.spacing.md,
  },
  menuSheet: { paddingBottom: theme.spacing.xl },
  menuRow: { minHeight: 52, flexDirection: "row", alignItems: "center", gap: 14, paddingHorizontal: 4, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  menuRowText: { fontFamily: theme.fontFamily.bodySemiBold, fontSize: 15, color: theme.colors.navy },
  menuRowDanger: { fontFamily: theme.fontFamily.bodySemiBold, fontSize: 15, color: theme.colors.red },
  sheetCopy: { fontFamily: theme.fontFamily.body, fontSize: 14, lineHeight: 21, color: theme.colors.textMedium },
  confirmActions: { flexDirection: "row", gap: 10 },
  cancelButton: { flex: 1, minHeight: 48, borderRadius: 999, alignItems: "center", justifyContent: "center", backgroundColor: theme.colors.card2 },
  cancelText: { fontFamily: theme.fontFamily.bodySemiBold, fontSize: 14.5, color: theme.colors.navy },
  deleteButton: { flex: 1, minHeight: 48, borderRadius: 999, alignItems: "center", justifyContent: "center", backgroundColor: theme.colors.red },
  sheetTitle: {
    fontFamily: theme.fontFamily.display,
    fontSize: 20,
    color: theme.colors.navy,
    marginBottom: theme.spacing.sm,
  },
  sheetInput: {
    minHeight: 48,
    borderRadius: theme.radius.md,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.card,
    paddingHorizontal: theme.spacing.lg,
    fontFamily: theme.fontFamily.body,
    fontSize: 15,
    color: theme.colors.text,
  },
  sheetPrimaryButton: {
    minHeight: 48,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  sheetPrimaryButtonDisabled: {
    opacity: 0.5,
  },
  sheetPrimaryButtonText: {
    fontFamily: theme.fontFamily.bodyBold,
    fontSize: 14,
    color: theme.colors.onDark,
  },
});
