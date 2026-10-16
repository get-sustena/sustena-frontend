import { useQueryClient } from "@tanstack/react-query";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import * as Sharing from "expo-sharing";
import { useSQLiteContext } from "expo-sqlite";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import ViewShot, { type ViewShotRef } from "react-native-view-shot";
import { ShoppingListItemRow } from "../../src/components/shopping/ShoppingListItemRow";
import { InPantrySection } from "../../src/components/shopping/InPantrySection";
import { AddShoppingItemSheet } from "../../src/components/shopping/AddShoppingItemSheet";
import { ShoppingListItemEditSheet } from "../../src/components/shopping/ShoppingListItemEditSheet";
import { ShoppingItemsSkeleton } from "../../src/components/shopping/ShoppingItemsSkeleton";
import { AppText } from "../../src/components/ui/AppText";
import { Icon } from "../../src/components/ui/Icon";
import { Logo } from "../../src/components/ui/Logo";
import { mapShoppingListRowToItem } from "../../src/db/shoppingItemRows";
import {
  getStoredShoppingListItems,
  replaceShoppingListItemsForList,
} from "../../src/db/shoppingListRepository";
import { getStoredShoppingLists, mapShoppingListRowToMeta } from "../../src/db/shoppingListsRepository";
import { resolveSyncIdMapping } from "../../src/db/syncIdMappingRepository";
import { useListCommands } from "../../src/hooks/useListCommands";
import { pendingListCreation } from "../../src/lib/shopping/listCommands";
import { markAllChange, tickMessage } from "../../src/lib/shopping/tickChanges";
import { useIsOnline } from "../../src/hooks/useIsOnline";
import { useRecordActivity, useScreenViewed } from "../../src/hooks/useActivity";
import { useShoppingCommands } from "../../src/hooks/useShoppingCommands";
import { shoppingListsApi } from "../../src/lib/api";
import { apiShoppingItemToLocalItem } from "../../src/lib/api/adapters";
import { groupShoppingListItems } from "../../src/lib/groupShoppingListItems";
import { formatShoppingQuantity } from "../../src/lib/textFormatters";
import { queryKeys } from "../../src/lib/query/queryKeys";
import { onSyncFinished } from "../../src/lib/sync/syncEvents";
import { useShoppingListsStore } from "../../src/store/shoppingListsStore";
import { closeSheet, openSheet, showToast } from "../../src/store/uiStore";
import { theme } from "../../src/theme/theme";
import {
  DEFAULT_SHOPPING_LIST_ID,
  ShoppingListItem,
} from "../../src/types/shoppingList";

export default function ShoppingListDetailScreen() {
  useScreenViewed("shopping_list");
  const { id, share } = useLocalSearchParams<{ id: string; share?: string }>();
  const activeListId = useShoppingListsStore((state) => state.activeListId);
  const resolvedId = id === DEFAULT_SHOPPING_LIST_ID ? activeListId : id;

  if (!resolvedId || resolvedId === DEFAULT_SHOPPING_LIST_ID) {
    return (
      <View style={[styles.screen, styles.body]}>
        <ShoppingItemsSkeleton />
      </View>
    );
  }

  return <LocalListDetail listId={resolvedId} shareOnOpen={share === "1"} />;
}

function ListHeader({
  title,
  onAddPress,
  onMenuPress,
}: {
  title: string;
  onAddPress: () => void;
  onMenuPress: () => void;
}) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.header, { paddingTop: Math.max(52, insets.top + 5) }]}>
      <Pressable
        onPress={() => router.back()}
        style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}
        accessibilityRole="button"
        accessibilityLabel="Back to shopping lists"
      >
        <Icon name="chevronLeft" size={19} color={theme.colors.text} />
      </Pressable>

      <AppText style={styles.headerTitle} numberOfLines={1}>
        {title}
      </AppText>

      <Pressable
        onPress={onAddPress}
        style={({ pressed }) => [styles.headerAddButton, pressed && styles.pressed]}
        accessibilityRole="button"
        accessibilityLabel="Add items"
      >
        <Icon name="plus" size={16} color={theme.colors.onDark} />
        <AppText style={styles.headerAddText}>Add</AppText>
      </Pressable>

      <Pressable
        onPress={onMenuPress}
        style={({ pressed }) => [
          styles.iconButton,
          pressed && styles.pressed,
        ]}
        accessibilityRole="button"
        accessibilityLabel="Shopping list options"
      >
        <Icon name="moreH" size={20} color={theme.colors.text} />
      </Pressable>
    </View>
  );
}

function MenuSheetRow({
  icon,
  label,
  onPress,
  destructive,
}: {
  icon: Parameters<typeof Icon>[0]["name"];
  label: string;
  onPress: () => void;
  destructive?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.menuRow, pressed && styles.pressed]}
    >
      <Icon
        name={icon}
        size={18}
        color={destructive ? theme.colors.red : theme.colors.text}
      />
      <AppText
        style={[styles.menuRowText, destructive && styles.menuRowTextDanger]}
      >
        {label}
      </AppText>
    </Pressable>
  );
}

function SummaryCard({
  itemCount,
  neededCount,
  checkedCount,
  onToggleSelectAll,
}: {
  itemCount: number;
  neededCount: number;
  checkedCount: number;
  onToggleSelectAll: () => void;
}) {
  const pct = itemCount > 0 ? (checkedCount / itemCount) * 100 : 0;
  const allChecked = itemCount > 0 && checkedCount === itemCount;

  return (
    <View style={styles.summaryCard}>
      <View style={styles.summaryRow}>
        <View style={styles.summaryLeft}>
          <AppText style={styles.summaryEyebrow}>On list</AppText>
          <View style={styles.summaryValueRow}>
            <AppText style={styles.summaryTotal}>{neededCount}</AppText>
            <AppText style={styles.summaryCount}>{neededCount === 1 ? "item" : "items"}</AppText>
          </View>
        </View>

        <View style={styles.summaryDivider} />

        <View style={styles.summaryRight}>
          <AppText style={styles.summaryEyebrow}>In pantry</AppText>
          <View style={styles.summaryValueRow}>
            <AppText style={styles.summaryTotal}>{checkedCount}</AppText>
            <AppText style={styles.summaryCount}>{checkedCount === 1 ? "item" : "items"}</AppText>
          </View>
        </View>
      </View>

      <View style={styles.summaryProgressTrack}>
        <View style={[styles.summaryProgressFill, { width: `${pct}%` }]} />
      </View>

      <View style={styles.summaryFooterRow}>
        <AppText style={styles.summaryFooterLabel}>
          {checkedCount} of {itemCount} in pantry
        </AppText>

        <Pressable
          onPress={onToggleSelectAll}
          disabled={itemCount === 0}
          accessibilityRole="button"
          accessibilityLabel={
            allChecked ? "Mark all as not in pantry" : "Mark all as in pantry"
          }
        >
          <AppText
            style={[
              styles.summarySelectAll,
              itemCount === 0 && styles.summarySelectAllDisabled,
            ]}
          >
            {allChecked ? "Mark all as not in pantry" : "Mark all as in pantry"}
          </AppText>
        </Pressable>
      </View>
    </View>
  );
}

function ShoppingEmptyState({ onAddPress }: { onAddPress: () => void }) {
  return (
    <View style={styles.emptyState}>
      <View style={styles.emptyStateIcon}>
        <Icon name="shop" size={30} color={theme.colors.textMutedAlt} />
      </View>
      <AppText style={styles.emptyStateTitle}>Nothing on this list yet</AppText>
      <AppText style={styles.emptyStateText}>
        Search for ingredients, or bring them in from a recipe or meal plan.
      </AppText>
      <Pressable
        onPress={onAddPress}
        style={({ pressed }) => [
          styles.emptyStateButton,
          pressed && styles.pressed,
        ]}
      >
        <Icon name="plus" size={15} color={theme.colors.onDark} />
        <AppText style={styles.emptyStateButtonText}>Add items</AppText>
      </Pressable>
      <View style={styles.emptyStateLinks}>
        <Pressable onPress={() => router.push("/(tabs)/recipes")}><AppText style={styles.emptyStateLink}>Browse recipes</AppText></Pressable>
        <Pressable onPress={() => router.push({ pathname: "/(tabs)/planner", params: { tab: "budget" } })}><AppText style={styles.emptyStateLink}>Open planner</AppText></Pressable>
      </View>
    </View>
  );
}

function ShareCard({
  shotRef,
  title,
  items,
}: {
  shotRef: React.RefObject<ViewShotRef | null>;
  title: string;
  items: ShoppingListItem[];
}) {
  return (
    <View style={styles.shareCardOffscreen} pointerEvents="none">
      <ViewShot ref={shotRef} options={{ format: "png", quality: 1 }}>
        <View style={styles.shareCard}>
          <View style={styles.shareCardHeader}>
            <Logo size={28} color={theme.colors.primary} />
            <AppText style={styles.shareCardWordmark}>Sustena</AppText>
          </View>

          <AppText style={styles.shareCardTitle}>{title}</AppText>

          {items.slice(0, 16).map((item) => (
            <View key={item.id} style={styles.shareCardRow}>
              <View
                style={[
                  styles.shareCardCheckbox,
                  item.checked && styles.shareCardCheckboxChecked,
                ]}
              />
              <AppText style={styles.shareCardItemName} numberOfLines={1}>
                {item.name}
              </AppText>
              <AppText style={styles.shareCardItemQty}>
                {formatShoppingQuantity(item.quantity)}
              </AppText>
            </View>
          ))}

          {items.length > 16 ? (
            <AppText style={styles.shareCardMore}>
              +{items.length - 16} more items
            </AppText>
          ) : null}

          <AppText style={styles.shareCardFooter}>Made with Sustena</AppText>
        </View>
      </ViewShot>
    </View>
  );
}

async function shareViewShot(shotRef: React.RefObject<ViewShotRef | null>, onShared: () => void) {
  try {
    const uri = await shotRef.current?.capture?.();
    if (!uri) return;

    if (Platform.OS === "web") {
      const link = document.createElement("a");
      link.href = uri;
      link.download = "sustena-shopping-list.png";
      document.body.appendChild(link);
      link.click();
      link.remove();
      onShared();
      return;
    }

    const isAvailable = await Sharing.isAvailableAsync();
    if (!isAvailable) {
      showToast("Sharing isn't available on this device", "danger");
      return;
    }

    await Sharing.shareAsync(uri, { mimeType: "image/png" });
    onShared();
  } catch (error) {
    console.error("Failed to share shopping list", error);
    showToast("Could not generate image", "danger");
  }
}


function LocalListDetail({ listId, shareOnOpen }: { listId: string; shareOnOpen: boolean }) {
  const db = useSQLiteContext();
  const isOnline = useIsOnline();
  const queryClient = useQueryClient();
  const shoppingCommands = useShoppingCommands();
  const shotRef = useRef<ViewShotRef | null>(null);
  const list = useShoppingListsStore((state) =>
    state.lists.find((item) => item.id === listId)
  );
  const hydrateLists = useShoppingListsStore((state) => state.hydrateLists);
  const renameListInStore = useShoppingListsStore((state) => state.renameList);
  const listCommands = useListCommands();
  const [items, setItems] = useState<ShoppingListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [pantryExpanded, setPantryExpanded] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState("All");
  const didShareOnOpen = useRef(false);
  const recordActivity = useRecordActivity();
  const shareList = useCallback(
    () => shareViewShot(shotRef, () => recordActivity({ type: "shopping_list_shared", properties: {} })),
    [recordActivity]
  );

  useEffect(() => {
    if (!shareOnOpen || isLoading || didShareOnOpen.current) return;
    didShareOnOpen.current = true;
    const frame = requestAnimationFrame(() => { void shareList(); });
    return () => cancelAnimationFrame(frame);
  }, [shareOnOpen, isLoading, shareList]);

  const loadItems = useCallback(async () => {
    const rows = await getStoredShoppingListItems(db, listId);
    setItems(rows.map(mapShoppingListRowToItem));
    setIsLoading(false);
  }, [db, listId]);

  const refreshFromServer = useCallback(async () => {
    if (!isOnline) return;
    // A list made on the phone isn't on the server until its creation is sent.
    if (await pendingListCreation(db, listId)) return;

    try {
      const requestedAt = Date.now();
      const serverList = await shoppingListsApi.getShoppingListById(listId);
      const serverItems = serverList.items
        .filter((item) => !item.deletedAt)
        .map((item) => ({ ...apiShoppingItemToLocalItem(item), listId }));

      setItems(await replaceShoppingListItemsForList(db, listId, serverItems, { requestedAt }));
    } catch (error) {
      console.error("Failed to refresh shopping list from server", error);
    }
  }, [db, isOnline, listId]);

  useFocusEffect(
    useCallback(() => {
      loadItems().then(refreshFromServer);
    }, [loadItems, refreshFromServer])
  );

  // Sent edits can swap a temporary id for the server's and move checked
  // items into the pantry.
  useEffect(
    () =>
      onSyncFinished(() => {
        // A list made on the phone moves to the server's id once it's there.
        void resolveSyncIdMapping(db, listId, "shopping_list").then((serverId) => {
          if (serverId) router.setParams({ id: serverId });
          else void loadItems();
        });
        void queryClient.invalidateQueries({ queryKey: queryKeys.pantry.me });
      }),
    [db, listId, loadItems, queryClient]
  );

  const checkedCount = items.filter((item) => item.checked).length;
  const neededItems = items.filter((item) => !item.checked);
  const pantryItems = items.filter((item) => item.checked);
  const sections = groupShoppingListItems(neededItems);
  const categoryOptions = ["All", ...sections.map((section) => section.category)];
  const activeCategory = categoryOptions.includes(selectedCategory) ? selectedCategory : "All";
  const visibleNeededItems = activeCategory === "All"
    ? neededItems
    : sections.find((section) => section.category === activeCategory)?.items ?? neededItems;

  async function handleToggleItem(itemId: string) {
    const item = items.find((current) => current.id === itemId);
    if (!item) return;

    const nextChecked = !item.checked;
    await setChecked([itemId], nextChecked);
    showToast(tickMessage(nextChecked), "default", {
      label: "Undo",
      onPress: () => void setChecked([itemId], !nextChecked),
    });
  }

  // On screen at once; saved with its outbox command, so it works offline.
  async function setChecked(itemIds: string[], checked: boolean) {
    setItems((current) => current.map((item) => (itemIds.includes(item.id) ? { ...item, checked } : item)));
    if (itemIds.length === 1) await shoppingCommands.setChecked({ listId, itemId: itemIds[0], checked });
    else await shoppingCommands.setManyChecked({ listId, itemIds, checked });
  }

  async function handleToggleSelectAll() {
    if (items.length === 0) return;
    // Undo flips back only the items this changed.
    const change = markAllChange(items);
    await setChecked(change.itemIds, change.checked);
    showToast(change.message, "default", {
      label: "Undo",
      onPress: () => void setChecked(change.itemIds, !change.checked),
    });
  }

  async function handleClearChecked() {
    closeSheet();
    setItems((current) => current.filter((item) => !item.checked));
    await shoppingCommands.clearChecked({ listId });
    showToast("Checked items removed", "success");
  }

  async function handleAddItem(
    name: string,
    start: { quantity: string; unit: string | null; displayQuantity: string },
    ingredientId?: string,
    category = "Pantry"
  ) {
    const item = await shoppingCommands.addItem({ listId, name, ...start, ingredientId, category });
    setItems((current) => [...current, item]);
    return item;
  }

  async function handleRename(name: string) {
    const trimmed = name.trim();
    if (!trimmed) return;

    // Saved on the phone at once, and sent when there's a connection.
    await listCommands.renameList({ listId, name: trimmed });
    renameListInStore(listId, trimmed);
    closeSheet();
    showToast("List renamed", "success");
  }

  function openItemMenu(item: ShoppingListItem) {
    openSheet(
      <ShoppingListItemEditSheet
        item={item}
        onSave={async (update) => {
          // Saved on the phone at once, and sent when there's a connection.
          await shoppingCommands.editItem({
            listId,
            itemId: item.id,
            name: update.name,
            quantity: update.quantity,
            unit: update.unit,
            category: update.category,
          });
          await loadItems();
          closeSheet();
          showToast("Item updated", "success");
        }}
        onRemove={async () => {
          closeSheet();
          setItems((current) => current.filter((entry) => entry.id !== item.id));
          const removed = await shoppingCommands.removeItem({ listId, itemId: item.id });
          showToast("Item removed", "default", {
            label: "Undo",
            onPress: async () => {
              await shoppingCommands.undoRemove({ listId, item: removed });
              await loadItems();
            },
          });
        }}
      />
    );
  }

  async function handleDelete() {
    await listCommands.deleteList({ listId });
    // Read back from the phone, which also knows the new active list.
    hydrateLists((await getStoredShoppingLists(db)).map(mapShoppingListRowToMeta));
    closeSheet();
    router.back();
    showToast("Shopping list deleted", "success");
  }

  function openAddItemSheet() {
    openSheet(
      <AddShoppingItemSheet
        listName={list?.name ?? "Shopping List"}
        existingItems={items}
        onAdd={handleAddItem}
        onEdit={openItemMenu}
      />
    );
  }

  function openRenameSheet() {
    openSheet(
      <RenameListSheet initialName={list?.name ?? ""} onRename={handleRename} />
    );
  }

  function openMenuSheet() {
    openSheet(
      <View style={styles.menuSheet}>
        <MenuSheetRow
          icon="pencil"
          label="Rename list"
          onPress={() => {
            closeSheet();
            openRenameSheet();
          }}
        />
        <MenuSheetRow
          icon="share"
          label="Share as image"
          onPress={() => {
            closeSheet();
            void shareList();
          }}
        />
        {checkedCount > 0 ? (
          <MenuSheetRow
            icon="check"
            label="Remove pantry items from list"
            onPress={() => {
              closeSheet();
              openSheet(
                <DeleteListSheet
                  listName={`${checkedCount} ${checkedCount === 1 ? "item" : "items"} you’ve marked as already in your pantry. Items you still need to buy stay on the list`}
                  onDelete={handleClearChecked}
                  pantryOnly
                />
              );
            }}
          />
        ) : null}
        <MenuSheetRow
          icon="trash"
          label="Delete list"
          destructive
          onPress={() => {
            closeSheet();
            openSheet(
              <DeleteListSheet
                listName={list?.name ?? "Shopping List"}
                onDelete={handleDelete}
              />
            );
          }}
        />
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <ListHeader
        title={list?.name ?? "Shopping List"}
        onAddPress={openAddItemSheet}
        onMenuPress={openMenuSheet}
      />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <ShareCard
          shotRef={shotRef}
          title={list?.name ?? "Shopping List"}
          items={items}
        />

        {items.length ? (
          <SummaryCard
            itemCount={items.length}
            neededCount={neededItems.length}
            checkedCount={checkedCount}
            onToggleSelectAll={handleToggleSelectAll}
          />
        ) : null}

        <View style={styles.body}>
          {isLoading ? (
            <ShoppingItemsSkeleton />
          ) : items.length === 0 ? (
            <ShoppingEmptyState onAddPress={openAddItemSheet} />
          ) : (
            <>
              <View style={styles.neededHeading}>
                <AppText style={styles.neededTitle}>Need to buy</AppText>
                <AppText style={styles.neededCount}>{neededItems.length} {neededItems.length === 1 ? "item" : "items"}</AppText>
              </View>
              {neededItems.length === 0 ? (
                <View style={styles.allInPantryNotice}>
                  <View style={styles.allInPantryIcon}>
                    <Icon name="check" size={18} color={theme.colors.linkGreen} />
                  </View>
                  <AppText style={styles.allInPantryText}>
                    Everything on this list is marked as in your pantry.
                  </AppText>
                </View>
              ) : (
                <>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll} contentContainerStyle={styles.categoryContent}>
                    {categoryOptions.map((category) => (
                      <Pressable key={category} onPress={() => setSelectedCategory(category)} style={[styles.categoryPill, activeCategory === category && styles.categoryPillSelected]} accessibilityRole="button" accessibilityState={{ selected: activeCategory === category }}>
                        <AppText style={[styles.categoryPillText, activeCategory === category && styles.categoryPillTextSelected]}>{category}</AppText>
                      </Pressable>
                    ))}
                  </ScrollView>
                  <View style={styles.itemsPanel}>
                    {visibleNeededItems.map((item) => (
                      <ShoppingListItemRow key={item.id} item={item} onToggle={handleToggleItem} onMenu={openItemMenu} />
                    ))}
                  </View>
                </>
              )}
              <InPantrySection
                items={pantryItems}
                expanded={pantryExpanded}
                onToggleExpanded={() => setPantryExpanded((current) => !current)}
                onToggleItem={handleToggleItem}
                onItemMenu={openItemMenu}
              />
            </>
          )}
        </View>

      </ScrollView>
    </View>
  );
}

function DeleteListSheet({
  listName,
  onDelete,
  pantryOnly = false,
}: {
  listName: string;
  onDelete: () => void | Promise<void>;
  pantryOnly?: boolean;
}) {
  return (
    <View style={styles.sheetContent}>
      <AppText style={styles.sheetTitle}>{pantryOnly ? "Remove pantry items?" : `Delete “${listName}”?`}</AppText>
      <AppText style={styles.deleteSheetText}>
        {pantryOnly ? `This removes the ${listName}.` : "This will permanently remove the list and its items."}
      </AppText>
      <View style={styles.confirmActions}>
        <Pressable onPress={closeSheet} style={styles.cancelButton}><AppText style={styles.cancelButtonText}>Cancel</AppText></Pressable>
        <Pressable onPress={onDelete} style={[styles.deleteConfirmButton, pantryOnly && styles.pantryConfirmButton]}>
          <AppText style={styles.deleteConfirmButtonText}>{pantryOnly ? "Remove items" : "Delete"}</AppText>
        </Pressable>
      </View>
    </View>
  );
}

function RenameListSheet({
  initialName,
  onRename,
}: {
  initialName: string;
  onRename: (name: string) => void;
}) {
  const [name, setName] = useState(initialName);

  return (
    <View style={styles.sheetContent}>
      <AppText style={styles.sheetTitle}>Rename List</AppText>

      <TextInput
        value={name}
        onChangeText={setName}
        placeholderTextColor={theme.colors.textMuted}
        style={styles.sheetInput}
        autoFocus
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
    paddingBottom: 120,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 52,
    paddingBottom: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  iconButton: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  headerAddButton: { width: 80, height: 44, borderRadius: 999, backgroundColor: theme.colors.navy, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 5 },
  headerAddText: { fontFamily: theme.fontFamily.bodyBold, fontSize: 13.5, color: "#FAFAFA" },
  headerTitle: {
    flex: 1,
    textAlign: "center",
    fontFamily: theme.fontFamily.display,
    fontSize: 18,
    letterSpacing: 0,
    color: theme.colors.text,
    paddingHorizontal: 4,
  },
  pressed: {
    opacity: 0.85,
  },
  body: {
    paddingHorizontal: 20,
  },
  neededHeading: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginHorizontal: 1, marginTop: 3, marginBottom: 9 },
  neededTitle: { fontFamily: theme.fontFamily.display, fontSize: 16, color: theme.colors.navy },
  neededCount: { fontFamily: theme.fontFamily.body, fontSize: 12.5, color: theme.colors.textMedium },
  categoryScroll: { marginHorizontal: -20, marginBottom: 12 },
  categoryContent: { paddingHorizontal: 20, paddingRight: 52, gap: 6 },
  categoryPill: { minHeight: 32, paddingHorizontal: 11, borderRadius: 999, borderWidth: 1, borderColor: theme.colors.border, backgroundColor: theme.colors.white, alignItems: "center", justifyContent: "center" },
  categoryPillSelected: { backgroundColor: theme.colors.navy, borderColor: theme.colors.navy },
  categoryPillText: { fontFamily: theme.fontFamily.bodySemiBold, fontSize: 11.75, color: theme.colors.textMedium },
  categoryPillTextSelected: { color: "#FAFAFA" },
  itemsPanel: { paddingVertical: 3, borderWidth: 1, borderColor: theme.colors.border, borderRadius: 16, backgroundColor: theme.colors.white, overflow: "hidden" },
  allInPantryNotice: { padding: 14, marginBottom: 15, borderWidth: 1, borderColor: theme.colors.border, borderRadius: 14, backgroundColor: theme.colors.card2, flexDirection: "row", alignItems: "center", gap: 11 },
  allInPantryIcon: { width: 34, height: 34, borderRadius: 10, backgroundColor: theme.colors.white, alignItems: "center", justifyContent: "center" },
  allInPantryText: { flex: 1, fontFamily: theme.fontFamily.body, fontSize: 13.5, lineHeight: 20, color: theme.colors.text },
  summaryCard: {
    marginHorizontal: 20,
    marginBottom: 16,
    backgroundColor: theme.colors.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingVertical: 15,
    paddingHorizontal: 16,
  },
  summaryRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 15,
    marginBottom: 14,
  },
  summaryLeft: {
    flex: 1,
    minWidth: 0,
    flexShrink: 1,
  },
  summaryRight: {
    flex: 1,
  },
  summaryDivider: { width: 1, height: 40, backgroundColor: theme.colors.border },
  summaryValueRow: { flexDirection: "row", alignItems: "baseline", gap: 6 },
  summaryEyebrow: {
    fontFamily: theme.fontFamily.body,
    fontSize: 12,
    color: theme.colors.textMuted,
    letterSpacing: 0,
    marginBottom: 3,
  },
  summaryTotal: {
    fontFamily: theme.fontFamily.display,
    fontSize: 27,
    lineHeight: 29,
    color: theme.colors.text,
  },
  summaryCount: {
    fontFamily: theme.fontFamily.body,
    fontSize: 12.5,
    color: theme.colors.textMuted,
  },
  summaryProgressTrack: {
    height: 5,
    borderRadius: 999,
    backgroundColor: theme.colors.card2,
    overflow: "hidden",
  },
  summaryProgressFill: {
    height: "100%",
    borderRadius: 999,
    backgroundColor: theme.colors.navy3,
  },
  summaryFooterRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 9,
  },
  summaryFooterLabel: {
    fontFamily: theme.fontFamily.body,
    fontSize: 12,
    color: theme.colors.textMuted,
  },
  summarySelectAll: {
    fontFamily: theme.fontFamily.bodyBold,
    fontSize: 12,
    color: theme.colors.navy3,
  },
  summarySelectAllDisabled: {
    opacity: 0.45,
  },
  emptyState: {
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 44,
  },
  emptyStateIcon: {
    width: 60,
    height: 60,
    borderRadius: 999,
    backgroundColor: "#EEF2E7",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  emptyStateTitle: {
    fontFamily: theme.fontFamily.display,
    fontSize: 16,
    color: theme.colors.text,
    marginBottom: 6,
  },
  emptyStateText: {
    maxWidth: 230,
    fontFamily: theme.fontFamily.body,
    fontSize: 13.5,
    lineHeight: 20,
    color: theme.colors.textMedium,
    textAlign: "center",
    marginBottom: 18,
  },
  emptyStateButton: {
    minHeight: 44,
    borderRadius: 999,
    paddingHorizontal: 22,
    backgroundColor: theme.colors.navy,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
  },
  emptyStateButtonText: {
    fontFamily: theme.fontFamily.bodySemiBold,
    fontSize: 14,
    color: theme.colors.onDark,
  },
  emptyStateLinks: {
    flexDirection: "row",
    alignItems: "center",
    gap: 22,
    marginTop: 18,
  },
  emptyStateLink: {
    fontFamily: theme.fontFamily.bodySemiBold,
    fontSize: 13,
    color: theme.colors.primary,
  },
  menuRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingVertical: 15,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  menuRowText: {
    fontFamily: theme.fontFamily.bodySemiBold,
    fontSize: 15,
    color: theme.colors.text,
  },
  menuRowTextDanger: {
    color: theme.colors.red,
  },
  sheetContent: {
    paddingBottom: theme.spacing.xl,
    gap: theme.spacing.md,
  },
  menuSheet: {
    paddingBottom: theme.spacing.xl,
  },
  sheetTitle: {
    fontFamily: theme.fontFamily.display,
    fontSize: 19,
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
  },
  sheetInput: {
    minHeight: 48,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.card2,
    paddingHorizontal: theme.spacing.lg,
    fontFamily: theme.fontFamily.body,
    fontSize: 15,
    color: theme.colors.text,
  },
  sheetPrimaryButton: {
    minHeight: 48,
    borderRadius: 999,
    backgroundColor: theme.colors.navy,
    alignItems: "center",
    justifyContent: "center",
  },
  sheetPrimaryButtonDisabled: {
    opacity: 0.5,
  },
  sheetPrimaryButtonText: {
    fontFamily: theme.fontFamily.bodySemiBold,
    fontSize: 14,
    color: theme.colors.onDark,
  },
  deleteSheetText: {
    fontFamily: theme.fontFamily.body,
    fontSize: 14,
    lineHeight: 20,
    color: theme.colors.textMedium,
  },
  deleteConfirmButton: {
    flex: 1,
    minHeight: 48,
    borderRadius: 999,
    backgroundColor: theme.colors.red,
    alignItems: "center",
    justifyContent: "center",
  },
  deleteConfirmButtonText: {
    fontFamily: theme.fontFamily.bodySemiBold,
    fontSize: 14,
    color: theme.colors.onDark,
  },
  confirmActions: { flexDirection: "row", gap: 10, marginTop: 6 },
  cancelButton: { flex: 1, minHeight: 48, borderRadius: 999, backgroundColor: theme.colors.card2, alignItems: "center", justifyContent: "center" },
  cancelButtonText: { fontFamily: theme.fontFamily.bodySemiBold, fontSize: 14, color: theme.colors.navy },
  pantryConfirmButton: { backgroundColor: theme.colors.navy },
  shareCardOffscreen: {
    position: "absolute",
    top: 0,
    left: -9999,
  },
  shareCard: {
    width: 360,
    backgroundColor: theme.colors.card,
    padding: 28,
  },
  shareCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 20,
  },
  shareCardWordmark: {
    fontFamily: theme.fontFamily.displayExtraBold,
    fontSize: 18,
    color: theme.colors.navy,
  },
  shareCardTitle: {
    fontFamily: theme.fontFamily.display,
    fontSize: 22,
    color: theme.colors.navy,
    marginBottom: 16,
  },
  shareCardRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  shareCardCheckbox: {
    width: 16,
    height: 16,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: theme.colors.border2,
  },
  shareCardCheckboxChecked: {
    backgroundColor: theme.colors.green,
    borderColor: theme.colors.green,
  },
  shareCardItemName: {
    flex: 1,
    fontFamily: theme.fontFamily.bodyMedium,
    fontSize: 14,
    color: theme.colors.text,
  },
  shareCardItemQty: {
    fontFamily: theme.fontFamily.body,
    fontSize: 11,
    color: theme.colors.textMuted,
  },
  shareCardMore: {
    fontFamily: theme.fontFamily.body,
    fontSize: 11,
    color: theme.colors.textMuted,
    marginTop: 8,
  },
  shareCardFooter: {
    marginTop: 20,
    textAlign: "center",
    fontFamily: theme.fontFamily.body,
    fontSize: 10,
    color: theme.colors.textDim,
    textTransform: "uppercase",
    letterSpacing: 0,
  },
});
