import { useFocusEffect } from "@react-navigation/native";
import { router } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { useCallback, useState } from "react";
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
import { Icon } from "../../src/components/ui/Icon";
import {
  deleteShoppingListItemsForList,
  getShoppingListItemSummaries,
} from "../../src/db/shoppingListRepository";
import {
  deleteShoppingList,
  renameShoppingList as renameShoppingListLocal,
  upsertShoppingList,
} from "../../src/db/shoppingListsRepository";
import {
  useCreateShoppingListMutation,
  useDeleteShoppingListMutation,
  useRenameShoppingListMutation,
} from "../../src/hooks/api/useShoppingLists";
import { useIsOnline } from "../../src/hooks/useIsOnline";
import { shoppingListsApi } from "../../src/lib/api";
import { getApiErrorMessage } from "../../src/lib/api/errors";
import { formatNaira } from "../../src/lib/formatters";
import { useShoppingListsStore } from "../../src/store/shoppingListsStore";
import { closeSheet, openSheet, showToast } from "../../src/store/uiStore";
import { theme } from "../../src/theme/theme";
import { ShoppingListMeta } from "../../src/types/shoppingList";

type ListSummary = {
  itemCount: number;
  checkedCount: number;
  totalEstimatedPrice: number;
};

export default function ShoppingListsScreen() {
  const insets = useSafeAreaInsets();
  const db = useSQLiteContext();
  const isOnline = useIsOnline();
  const lists = useShoppingListsStore((state) => state.lists);
  const addList = useShoppingListsStore((state) => state.addList);
  const renameListInStore = useShoppingListsStore((state) => state.renameList);
  const removeListInStore = useShoppingListsStore((state) => state.removeList);
  const hydrateLists = useShoppingListsStore((state) => state.hydrateLists);
  const createShoppingListMutation = useCreateShoppingListMutation();
  const renameShoppingListMutation = useRenameShoppingListMutation();
  const deleteShoppingListMutation = useDeleteShoppingListMutation();
  const [summaries, setSummaries] = useState<Record<string, ListSummary>>({});

  const loadSummaries = useCallback(async () => {
    const rows = await getShoppingListItemSummaries(db);
    const next: Record<string, ListSummary> = {};

    for (const row of rows) {
      next[row.list_id] = {
        itemCount: row.item_count,
        checkedCount: row.checked_count,
        totalEstimatedPrice: row.total_estimated_price ?? 0,
      };
    }

    setSummaries(next);
  }, [db]);

  const syncListsFromServer = useCallback(async () => {
    if (!isOnline) return;

    try {
      const serverLists = await shoppingListsApi.getShoppingLists();
      const currentLists = useShoppingListsStore.getState().lists;
      const defaultList = currentLists.find((list) => list.isDefaultSyncedList);
      const serverNonDefault = serverLists.filter((list) => !list.isActive);
      const serverIds = new Set(serverNonDefault.map((list) => list.id));

      const staleLocalLists = currentLists.filter(
        (list) => !list.isDefaultSyncedList && !serverIds.has(list.id)
      );

      for (const stale of staleLocalLists) {
        await deleteShoppingListItemsForList(db, stale.id);
        await deleteShoppingList(db, stale.id);
      }

      const mergedNonDefault: ShoppingListMeta[] = serverNonDefault.map(
        (list) => ({
          id: list.id,
          name: list.name,
          isDefaultSyncedList: false,
          createdAt: list.createdAt,
          updatedAt: list.updatedAt,
        })
      );

      for (const list of mergedNonDefault) {
        await upsertShoppingList(db, list);
      }

      hydrateLists(
        defaultList ? [defaultList, ...mergedNonDefault] : mergedNonDefault
      );
    } catch (error) {
      console.error("Failed to sync shopping lists from server", error);
    }
  }, [db, hydrateLists, isOnline]);

  useFocusEffect(
    useCallback(() => {
      loadSummaries();
      syncListsFromServer();
    }, [loadSummaries, syncListsFromServer])
  );

  async function handleCreateList(name: string) {
    const trimmed = name.trim();
    if (!trimmed) return;

    if (!isOnline) {
      closeSheet();
      showToast("You're offline. Connect to create a new list", "danger");
      return;
    }

    try {
      const created = await createShoppingListMutation.mutateAsync({
        name: trimmed,
      });
      const list: ShoppingListMeta = {
        id: created.id,
        name: created.name,
        isDefaultSyncedList: false,
        createdAt: created.createdAt,
        updatedAt: created.updatedAt,
      };

      await upsertShoppingList(db, list);
      addList(list);
      closeSheet();
      showToast("List created", "success");
    } catch (error) {
      closeSheet();
      showToast(getApiErrorMessage(error), "danger");
    }
  }

  function openCreateSheet() {
    openSheet(<CreateListSheet onCreate={handleCreateList} />);
  }

  async function handleRenameList(list: ShoppingListMeta, name: string) {
    const trimmed = name.trim();
    if (!trimmed) return;

    if (!isOnline) {
      closeSheet();
      showToast("You're offline. Connect to rename this list", "danger");
      return;
    }

    try {
      await renameShoppingListMutation.mutateAsync({
        shoppingListId: list.id,
        payload: { name: trimmed },
      });
      await renameShoppingListLocal(db, list.id, trimmed);
      renameListInStore(list.id, trimmed);
      closeSheet();
      showToast("List renamed", "success");
    } catch (error) {
      closeSheet();
      showToast(getApiErrorMessage(error), "danger");
    }
  }

  async function handleDeleteList(list: ShoppingListMeta) {
    if (!isOnline) {
      closeSheet();
      showToast("You're offline. Connect to delete this list", "danger");
      return;
    }

    try {
      await deleteShoppingListMutation.mutateAsync(list.id);
      await deleteShoppingListItemsForList(db, list.id);
      await deleteShoppingList(db, list.id);
      removeListInStore(list.id);
      closeSheet();
      showToast("Shopping list deleted", "success");
    } catch (error) {
      closeSheet();
      showToast(getApiErrorMessage(error), "danger");
    }
  }

  function openListOptionsSheet(list: ShoppingListMeta) {
    openSheet(
      <ListOptionsSheet
        list={list}
        onRename={(name) => handleRenameList(list, name)}
        onDelete={() => handleDeleteList(list)}
      />
    );
  }

  return (
    <Animated.View entering={FadeInDown.duration(320)} style={styles.screen}>
      <View
        style={[styles.header, { paddingTop: Math.max(52, insets.top + 5) }]}
      >
        <AppText style={styles.title}>Your Lists</AppText>

        <Pressable
          onPress={openCreateSheet}
          style={({ pressed }) => [
            styles.newListButton,
            pressed && styles.pressed,
          ]}
        >
          <Icon name="plus" size={20} color={theme.colors.onDark} />
        </Pressable>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {lists.length === 0 ? (
          <View style={styles.empty}>
            <View style={styles.emptyIconWrap}>
              <Icon name="list" size={30} color={theme.colors.textMutedAlt} />
            </View>

            <AppText style={styles.emptyTitle}>No shopping lists yet</AppText>
            <AppText style={styles.emptyText}>
              Create a list to start collecting ingredients for your next
              cook-up.
            </AppText>

            <Pressable
              onPress={openCreateSheet}
              style={({ pressed }) => [
                styles.emptyButton,
                pressed && styles.pressed,
              ]}
            >
              <AppText style={styles.emptyButtonText}>
                Create Shopping List
              </AppText>
            </Pressable>
          </View>
        ) : (
          <View style={styles.listGrid}>
            {lists.map((list) => {
              const summary = summaries[list.id];
              const itemCount = summary?.itemCount ?? 0;
              const checkedCount = summary?.checkedCount ?? 0;
              const pct = itemCount > 0 ? (checkedCount / itemCount) * 100 : 0;

              return (
                <Pressable
                  key={list.id}
                  onPress={() =>
                    router.push({
                      pathname: "/shopping/[id]",
                      params: { id: list.id },
                    })
                  }
                  style={({ pressed }) => [
                    styles.listCard,
                    pressed && styles.pressed,
                  ]}
                >
                  <View style={styles.listCardTop}>
                    <View style={styles.listInfo}>
                      <AppText style={styles.listName} numberOfLines={1}>
                        {list.name}
                      </AppText>

                      <AppText style={styles.listMeta}>
                        {itemCount} {itemCount === 1 ? "item" : "items"}
                        {summary && summary.totalEstimatedPrice > 0
                          ? ` · ${formatNaira(summary.totalEstimatedPrice)}`
                          : ""}
                      </AppText>
                    </View>

                    <Pressable
                      onPress={() => {
                        if (list.isDefaultSyncedList) {
                          router.push({
                            pathname: "/shopping/[id]",
                            params: { id: list.id },
                          });
                          return;
                        }

                        openListOptionsSheet(list);
                      }}
                      hitSlop={8}
                      style={styles.optionsButton}
                      accessibilityRole="button"
                      accessibilityLabel={`Options for ${list.name}`}
                    >
                      <Icon
                        name="moreH"
                        size={17}
                        color={theme.colors.textMuted}
                      />
                    </Pressable>
                  </View>

                  {itemCount > 0 ? (
                    <>
                      <View style={styles.progressTrack}>
                        <View
                          style={[styles.progressFill, { width: `${pct}%` }]}
                        />
                      </View>
                      <AppText style={styles.progressLabel}>
                        {checkedCount} of {itemCount} checked off
                      </AppText>
                    </>
                  ) : (
                    <AppText style={styles.emptyListLabel}>
                      Nothing added yet
                    </AppText>
                  )}
                </Pressable>
              );
            })}

            <Pressable
              onPress={openCreateSheet}
              style={({ pressed }) => [
                styles.newListRow,
                pressed && styles.pressed,
              ]}
            >
              <Icon name="plus" size={16} color={theme.colors.textMedium} />
              <AppText style={styles.newListRowText}>New Shopping List</AppText>
            </Pressable>
          </View>
        )}
      </ScrollView>
    </Animated.View>
  );
}

function CreateListSheet({ onCreate }: { onCreate: (name: string) => void }) {
  const [name, setName] = useState("");

  return (
    <View style={styles.sheetContent}>
      <AppText style={styles.sheetTitle}>New List</AppText>

      <TextInput
        value={name}
        onChangeText={setName}
        placeholder="e.g. Weekend Groceries"
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
        <AppText style={styles.sheetPrimaryButtonText}>Create List</AppText>
      </Pressable>
    </View>
  );
}

function ListOptionsSheet({
  list,
  onRename,
  onDelete,
}: {
  list: ShoppingListMeta;
  onRename: (name: string) => void;
  onDelete: () => void;
}) {
  const [name, setName] = useState(list.name);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);

  return (
    <View style={styles.sheetContent}>
      <AppText style={styles.sheetTitle}>Edit List</AppText>

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
        <AppText style={styles.sheetPrimaryButtonText}>Save Name</AppText>
      </Pressable>

      <Pressable
        onPress={() => {
          if (isConfirmingDelete) {
            onDelete();
            return;
          }
          setIsConfirmingDelete(true);
        }}
        style={styles.sheetDangerButton}
      >
        <Icon name="trash" size={15} color={theme.colors.red} />
        <AppText style={styles.sheetDangerButtonText}>
          {isConfirmingDelete ? "Tap again to confirm delete" : "Delete List"}
        </AppText>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: theme.colors.white,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 4,
    paddingBottom: 120,
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
    letterSpacing: 0,
    color: theme.colors.navy,
  },
  newListButton: {
    width: 44,
    height: 44,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.navy,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: theme.colors.text,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.14,
    shadowRadius: 6,
    elevation: 2,
  },
  empty: {
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 56,
  },
  emptyIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 999,
    backgroundColor: "#EEF2E7",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 18,
  },
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
  },
  emptyButtonText: {
    fontFamily: theme.fontFamily.bodySemiBold,
    fontSize: 14.5,
    color: theme.colors.onDark,
  },
  listGrid: {
    paddingHorizontal: 20,
  },
  listCard: {
    backgroundColor: theme.colors.cream,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 18,
    padding: 16,
    paddingBottom: 14,
    marginBottom: 12,
    shadowColor: theme.colors.text,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.08,
    shadowRadius: 11,
    elevation: 2,
  },
  pressed: {
    opacity: 0.9,
  },
  listCardTop: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 10,
    marginBottom: 10,
  },
  listInfo: {
    flex: 1,
    minWidth: 0,
  },
  listName: {
    fontFamily: theme.fontFamily.display,
    fontSize: 16.5,
    lineHeight: 21,
    color: theme.colors.text,
  },
  listMeta: {
    fontFamily: theme.fontFamily.mono,
    fontSize: 13,
    color: theme.colors.textMedium,
    marginTop: 4,
  },
  optionsButton: {
    width: 32,
    height: 32,
    borderRadius: 9,
    backgroundColor: theme.colors.card2,
    alignItems: "center",
    justifyContent: "center",
  },
  progressTrack: {
    height: 6,
    borderRadius: 999,
    backgroundColor: theme.colors.border,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 999,
    backgroundColor: theme.colors.green,
  },
  progressLabel: {
    fontFamily: theme.fontFamily.mono,
    fontSize: 12,
    color: theme.colors.textMuted,
    marginTop: 7,
  },
  emptyListLabel: {
    fontFamily: theme.fontFamily.body,
    fontSize: 12.5,
    color: theme.colors.textMuted,
  },
  newListRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderColor: theme.colors.border,
    borderRadius: 16,
    padding: 15,
    marginTop: 4,
  },
  newListRowText: {
    fontFamily: theme.fontFamily.bodySemiBold,
    fontSize: 14,
    color: theme.colors.textMedium,
  },
  sheetContent: {
    paddingBottom: theme.spacing.xl,
    gap: theme.spacing.md,
  },
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
  sheetDangerButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: theme.spacing.sm,
    minHeight: 48,
    borderRadius: theme.radius.md,
    borderWidth: 1.5,
    borderColor: theme.colors.red,
  },
  sheetDangerButtonText: {
    fontFamily: theme.fontFamily.bodyBold,
    fontSize: 13,
    color: theme.colors.red,
  },
});
