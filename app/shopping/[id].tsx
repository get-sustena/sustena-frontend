// app/shopping/[id].tsx
//
// List detail. The default list (id === "default") is the one list wired to
// the real backend + sync queue, exactly as before the redesign. Every other
// list is a real synced resource via /shopping-lists, created from the
// "Your Lists" overview.

import { router, useLocalSearchParams } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { useCallback, useRef, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import ViewShot from "react-native-view-shot";
import * as Sharing from "expo-sharing";
import { useFocusEffect } from "@react-navigation/native";
import { ShoppingListSection } from "../../src/components/shopping/ShoppingListSection";
import { AppText } from "../../src/components/ui/AppText";
import { Button } from "../../src/components/ui/Button";
import { EmptyState } from "../../src/components/ui/EmptyState";
import { Icon } from "../../src/components/ui/Icon";
import { Logo } from "../../src/components/ui/Logo";
import { ProgressLoader } from "../../src/components/ui/ProgressLoader";
import {
  deleteCheckedShoppingListItems,
  deleteShoppingListItem,
  getStoredShoppingListItems,
  insertShoppingListItem,
  mapShoppingListRowToItem,
  updateShoppingListItemChecked,
} from "../../src/db/shoppingListRepository";
import {
  deleteShoppingList,
  renameShoppingList as renameShoppingListLocal,
} from "../../src/db/shoppingListsRepository";
import { enqueueSyncOperation } from "../../src/db/syncQueueRepository";
import {
  useAddShoppingListItemMutation,
  useClearCheckedShoppingListItemsMutation,
  useShoppingListQuery,
  useUpdateShoppingListItemMutation,
} from "../../src/hooks/api/useShoppingList";
import {
  useDeleteShoppingListMutation,
  useRenameShoppingListMutation,
} from "../../src/hooks/api/useShoppingLists";
import { useIsOnline } from "../../src/hooks/useIsOnline";
import { apiShoppingItemToLocalItem } from "../../src/lib/api/adapters";
import { getApiErrorMessage } from "../../src/lib/api/errors";
import { shoppingListsApi } from "../../src/lib/api";
import { createLocalId } from "../../src/lib/id";
import { formatNaira } from "../../src/lib/formatters";
import { groupShoppingListItems } from "../../src/lib/groupShoppingListItems";
import { formatShoppingQuantity } from "../../src/lib/textFormatters";
import { useShoppingListStore } from "../../src/store/shoppingListStore";
import { useShoppingListsStore } from "../../src/store/shoppingListsStore";
import { closeSheet, openSheet, showToast } from "../../src/store/uiStore";
import { theme } from "../../src/theme/theme";
import {
  DEFAULT_SHOPPING_LIST_ID,
  ShoppingListItem,
} from "../../src/types/shoppingList";

export default function ShoppingListDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const isDefaultList = id === DEFAULT_SHOPPING_LIST_ID;

  return isDefaultList ? <DefaultListDetail /> : <LocalListDetail listId={id} />;
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
    <View
      style={[
        styles.header,
        { paddingTop: Math.max(52, insets.top + 5) },
      ]}
    >
      <Pressable
        onPress={() => router.back()}
        style={({ pressed }) => [
          styles.iconButton,
          pressed && styles.pressed,
        ]}
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
        style={({ pressed }) => [
          styles.iconButton,
          pressed && styles.pressed,
        ]}
        accessibilityRole="button"
        accessibilityLabel="Add ingredients"
      >
        <Icon name="plus" size={19} color={theme.colors.text} />
      </Pressable>

      <Pressable
        onPress={onMenuPress}
        style={({ pressed }) => [
          styles.iconButton,
          styles.menuIconButton,
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
  listName,
  total,
  itemCount,
  checkedCount,
  onToggleSelectAll,
}: {
  listName: string;
  total: number;
  itemCount: number;
  checkedCount: number;
  onToggleSelectAll: () => void;
}) {
  const pct = itemCount > 0 ? (checkedCount / itemCount) * 100 : 0;
  const allChecked = itemCount > 0 && checkedCount === itemCount;

  return (
    <View style={styles.summaryCard}>
      <View style={styles.summaryRow}>
        <View style={styles.summaryLeft}>
          <AppText style={styles.summaryEyebrow}>Active List</AppText>
          <AppText style={styles.summaryName} numberOfLines={1}>
            {listName}
          </AppText>
        </View>

        <View style={styles.summaryRight}>
          <AppText style={styles.summaryEyebrow}>Total</AppText>
          <AppText style={styles.summaryTotal}>{formatNaira(total)}</AppText>
          <AppText style={styles.summaryCount}>
            {itemCount} {itemCount === 1 ? "item" : "items"}
          </AppText>
        </View>
      </View>

      <View style={styles.summaryProgressTrack}>
        <View
          style={[styles.summaryProgressFill, { width: `${pct}%` }]}
        />
      </View>

      <View style={styles.summaryFooterRow}>
        <AppText style={styles.summaryFooterLabel}>
          {checkedCount} of {itemCount} items ticked off
        </AppText>

        <Pressable
          onPress={onToggleSelectAll}
          disabled={itemCount === 0}
          accessibilityRole="button"
          accessibilityLabel={allChecked ? "Deselect all items" : "Select all items"}
        >
          <AppText
            style={[
              styles.summarySelectAll,
              itemCount === 0 && styles.summarySelectAllDisabled,
            ]}
          >
            {allChecked ? "Deselect all" : "Select all"}
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
      <AppText style={styles.emptyStateTitle}>This list is empty</AppText>
      <AppText style={styles.emptyStateText}>
        Add ingredients yourself, or open a recipe and tap “Add to Shopping
        List”.
      </AppText>
      <Pressable
        onPress={onAddPress}
        style={({ pressed }) => [
          styles.emptyStateButton,
          pressed && styles.pressed,
        ]}
      >
        <Icon name="plus" size={15} color={theme.colors.onDark} />
        <AppText style={styles.emptyStateButtonText}>Add ingredients</AppText>
      </Pressable>
    </View>
  );
}

function CheckoutButton() {
  function handleCheckout() {
    showToast("Connecting to checkout...");
    setTimeout(() => showToast("Cart sent! Redirecting..."), 1600);
  }

  return (
    <Pressable
      onPress={handleCheckout}
      style={({ pressed }) => [
        styles.checkoutButton,
        pressed && styles.pressed,
      ]}
      accessibilityRole="button"
    >
      <Icon name="shop" size={18} color={theme.colors.onDark} />
      <AppText style={styles.checkoutButtonText}>Checkout</AppText>
    </Pressable>
  );
}

function ShareCard({
  shotRef,
  title,
  items,
  totalEstimatedCost,
}: {
  shotRef: React.RefObject<ViewShot | null>;
  title: string;
  items: ShoppingListItem[];
  totalEstimatedCost: number;
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

          {totalEstimatedCost > 0 ? (
            <View style={styles.shareCardTotal}>
              <AppText style={styles.shareCardTotalLabel}>
                Estimated Total
              </AppText>
              <AppText style={styles.shareCardTotalValue}>
                {formatNaira(totalEstimatedCost)}
              </AppText>
            </View>
          ) : null}

          <AppText style={styles.shareCardFooter}>
            Made with Sustena
          </AppText>
        </View>
      </ViewShot>
    </View>
  );
}

async function shareViewShot(shotRef: React.RefObject<ViewShot | null>) {
  try {
    const uri = await shotRef.current?.capture?.();
    if (!uri) return;

    const isAvailable = await Sharing.isAvailableAsync();
    if (!isAvailable) {
      showToast("Sharing isn't available on this device", "danger");
      return;
    }

    await Sharing.shareAsync(uri, { mimeType: "image/png" });
  } catch (error) {
    console.error("Failed to share shopping list", error);
    showToast("Could not create share image", "danger");
  }
}

function DefaultListDetail() {
  const db = useSQLiteContext();
  const shotRef = useRef<ViewShot | null>(null);

  const items = useShoppingListStore((state) => state.items);
  const toggleItem = useShoppingListStore((state) => state.toggleItem);
  const removeItemLocal = useShoppingListStore((state) => state.removeItem);
  const clearCheckedItems = useShoppingListStore(
    (state) => state.clearCheckedItems
  );
  const shoppingListQuery = useShoppingListQuery();
  const updateShoppingItemMutation = useUpdateShoppingListItemMutation();
  const addShoppingItemMutation = useAddShoppingListItemMutation();
  const clearCheckedMutation = useClearCheckedShoppingListItemsMutation();
  const apiItems =
    shoppingListQuery.data?.items.map(apiShoppingItemToLocalItem) ?? [];
  const visibleItems = apiItems.length > 0 ? apiItems : items;

  const visibleItemCount = visibleItems.length;
  const visibleCheckedCount = visibleItems.filter((item) => item.checked).length;
  const visibleTotalEstimatedCost = visibleItems.reduce(
    (total, item) => total + item.estimatedPrice,
    0
  );
  const sections = groupShoppingListItems(visibleItems);

  async function handleToggleItem(itemId: string) {
    const item = visibleItems.find((currentItem) => currentItem.id === itemId);
    if (!item) return;

    const nextChecked = !item.checked;

    toggleItem(itemId);
    updateShoppingListItemChecked(db, itemId, nextChecked).catch((error) => {
      console.error("Failed to persist shopping item locally", error);
    });

    try {
      await updateShoppingItemMutation.mutateAsync({
        itemId,
        payload: { checked: nextChecked },
      });
    } catch (error) {
      console.error("Failed to sync shopping item, queuing for retry", error);
      await enqueueSyncOperation(db, "shopping_toggle", {
        itemId,
        checked: nextChecked,
      }).catch((queueError) => {
        console.error("Failed to queue shopping item sync", queueError);
      });
    }
  }

  async function handleToggleSelectAll() {
    const allChecked =
      visibleItemCount > 0 && visibleCheckedCount === visibleItemCount;
    const nextChecked = !allChecked;
    const itemsToFlip = visibleItems.filter(
      (item) => item.checked !== nextChecked
    );

    await Promise.all(
      itemsToFlip.map((item) => handleToggleItem(item.id))
    );
  }

  async function handleClearCheckedItems() {
    clearCheckedItems();
    deleteCheckedShoppingListItems(db).catch((error) => {
      console.error("Failed to clear shopping items locally", error);
    });

    try {
      await clearCheckedMutation.mutateAsync();
    } catch (error) {
      console.error("Failed to sync shopping list clear, queuing for retry", error);
      await enqueueSyncOperation(db, "shopping_clear_checked", {}).catch(
        (queueError) => {
          console.error("Failed to queue shopping list clear", queueError);
        }
      );
    }
  }

  async function handleAddItem(name: string, quantity: string) {
    const now = new Date().toISOString();
    const trimmedName = name.trim();
    const trimmedQuantity = quantity.trim() || "1";
    const localId = createLocalId("shopping_item");
    const newItem: ShoppingListItem = {
      id: localId,
      name: trimmedName,
      emoji: "🛒",
      quantity: trimmedQuantity,
      category: "Pantry",
      estimatedPrice: 0,
      checked: false,
      createdAt: now,
      updatedAt: now,
      listId: DEFAULT_SHOPPING_LIST_ID,
    };

    useShoppingListStore.getState().addItems([newItem]);
    await insertShoppingListItem(db, newItem);
    closeSheet();

    try {
      const created = await addShoppingItemMutation.mutateAsync({
        name: trimmedName,
        quantity: trimmedQuantity,
        category: "Pantry",
      });
      const reconciled = apiShoppingItemToLocalItem(created);

      removeItemLocal(localId);
      await deleteShoppingListItem(db, localId);
      useShoppingListStore.getState().addItems([reconciled]);
      await insertShoppingListItem(db, reconciled);
    } catch (error) {
      console.error("Failed to sync new item, queuing for retry", error);
      await enqueueSyncOperation(db, "shopping_add", {
        name: trimmedName,
        quantity: trimmedQuantity,
        category: "Pantry",
      }).catch((queueError) => {
        console.error("Failed to queue new item sync", queueError);
      });
    }
  }

  function openAddItemSheet() {
    openSheet(<AddItemSheet onAdd={handleAddItem} />);
  }

  function openMenuSheet() {
    openSheet(
      <View style={styles.sheetContent}>
        <AppText style={styles.sheetTitle}>Shopping List</AppText>

        <MenuSheetRow
          icon="check"
          label="Clear Checked Items"
          onPress={() => {
            closeSheet();
            handleClearCheckedItems();
          }}
        />
        <MenuSheetRow
          icon="share"
          label="Share Shopping List"
          onPress={() => {
            closeSheet();
            shareViewShot(shotRef);
          }}
        />
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <ListHeader
        title="My Shopping List"
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
          title="My Shopping List"
          items={visibleItems}
          totalEstimatedCost={visibleTotalEstimatedCost}
        />

        <SummaryCard
          listName="My Shopping List"
          total={visibleTotalEstimatedCost}
          itemCount={visibleItemCount}
          checkedCount={visibleCheckedCount}
          onToggleSelectAll={handleToggleSelectAll}
        />

        <View style={styles.body}>
          {shoppingListQuery.isLoading ? (
            <ProgressLoader message="Fetching your shopping list..." />
          ) : shoppingListQuery.isError && visibleItemCount === 0 ? (
            <View style={styles.errorState}>
              <EmptyState
                icon="⚠️"
                title="Could not load list"
                message={getApiErrorMessage(shoppingListQuery.error)}
              />
              <Button
                title="Try again"
                onPress={() => shoppingListQuery.refetch()}
              />
            </View>
          ) : visibleItemCount === 0 ? (
            <ShoppingEmptyState onAddPress={openAddItemSheet} />
          ) : (
            sections.map((section) => (
              <ShoppingListSection
                key={section.category}
                category={section.category}
                items={section.items}
                onToggleItem={handleToggleItem}
              />
            ))
          )}
        </View>

        {!shoppingListQuery.isLoading ? <CheckoutButton /> : null}
      </ScrollView>
    </View>
  );
}

function LocalListDetail({ listId }: { listId: string }) {
  const db = useSQLiteContext();
  const isOnline = useIsOnline();
  const shotRef = useRef<ViewShot | null>(null);
  const list = useShoppingListsStore((state) =>
    state.lists.find((item) => item.id === listId)
  );
  const removeListInStore = useShoppingListsStore((state) => state.removeList);
  const renameListInStore = useShoppingListsStore((state) => state.renameList);
  const renameShoppingListMutation = useRenameShoppingListMutation();
  const deleteShoppingListMutation = useDeleteShoppingListMutation();
  const [items, setItems] = useState<ShoppingListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadItems = useCallback(async () => {
    const rows = await getStoredShoppingListItems(db, listId);
    setItems(rows.map(mapShoppingListRowToItem));
    setIsLoading(false);
  }, [db, listId]);

  const refreshFromServer = useCallback(async () => {
    if (!isOnline) return;

    try {
      const serverList = await shoppingListsApi.getShoppingListById(listId);
      const serverItems = serverList.items
        .filter((item) => !item.deletedAt)
        .map((item) => ({ ...apiShoppingItemToLocalItem(item), listId }));

      for (const item of serverItems) {
        await insertShoppingListItem(db, item);
      }

      setItems(serverItems);
    } catch (error) {
      // Best-effort refresh — the local cache is still shown either way.
      console.error("Failed to refresh shopping list from server", error);
    }
  }, [db, isOnline, listId]);

  useFocusEffect(
    useCallback(() => {
      loadItems().then(refreshFromServer);
    }, [loadItems, refreshFromServer])
  );

  const checkedCount = items.filter((item) => item.checked).length;
  const totalEstimatedCost = items.reduce(
    (total, item) => total + item.estimatedPrice,
    0
  );
  const sections = groupShoppingListItems(items);

  async function handleToggleItem(itemId: string) {
    const item = items.find((current) => current.id === itemId);
    if (!item) return;

    const nextChecked = !item.checked;

    // Local-first: the checkbox and its persisted state update immediately,
    // regardless of network availability. The server sync below is
    // best-effort and never blocks or reverts the local change.
    setItems((current) =>
      current.map((entry) =>
        entry.id === itemId ? { ...entry, checked: nextChecked } : entry
      )
    );
    await updateShoppingListItemChecked(db, itemId, nextChecked);

    try {
      await shoppingListsApi.updateShoppingListItemInList(listId, itemId, {
        checked: nextChecked,
      });
    } catch (error) {
      console.error("Failed to sync list item, queuing for retry", error);
      await enqueueSyncOperation(db, "shopping_list_item_toggle", {
        listId,
        itemId,
        checked: nextChecked,
      }).catch((queueError) => {
        console.error("Failed to queue list item sync", queueError);
      });
    }
  }

  async function handleToggleSelectAll() {
    const allChecked = items.length > 0 && checkedCount === items.length;
    const nextChecked = !allChecked;
    const itemsToFlip = items.filter((item) => item.checked !== nextChecked);

    await Promise.all(itemsToFlip.map((item) => handleToggleItem(item.id)));
  }

  async function handleClearChecked() {
    const checkedIds = items.filter((item) => item.checked).map((item) => item.id);
    setItems((current) => current.filter((item) => !item.checked));

    await Promise.all(
      checkedIds.map(async (itemId) => {
        await deleteShoppingListItem(db, itemId);

        try {
          await shoppingListsApi.deleteShoppingListItemFromList(listId, itemId);
        } catch (error) {
          console.error("Failed to sync item removal, queuing for retry", error);
          await enqueueSyncOperation(db, "shopping_list_item_remove", {
            listId,
            itemId,
          }).catch((queueError) => {
            console.error("Failed to queue item removal sync", queueError);
          });
        }
      })
    );
  }

  async function handleAddItem(name: string, quantity: string) {
    const now = new Date().toISOString();
    const trimmedName = name.trim();
    const trimmedQuantity = quantity.trim() || "1";
    const localId = createLocalId("shopping_item");
    const newItem: ShoppingListItem = {
      id: localId,
      name: trimmedName,
      emoji: "🛒",
      quantity: trimmedQuantity,
      category: "Pantry",
      estimatedPrice: 0,
      checked: false,
      createdAt: now,
      updatedAt: now,
      listId,
    };

    // Local-first: show the item immediately under a client-generated id,
    // then best-effort create it server-side and adopt the real id.
    await insertShoppingListItem(db, newItem);
    setItems((current) => [...current, newItem]);
    closeSheet();

    try {
      const created = await shoppingListsApi.addShoppingListItemToList(listId, {
        name: trimmedName,
        quantity: trimmedQuantity,
        category: "Pantry",
      });
      const reconciled: ShoppingListItem = {
        ...apiShoppingItemToLocalItem(created),
        listId,
      };

      await deleteShoppingListItem(db, localId);
      await insertShoppingListItem(db, reconciled);
      setItems((current) =>
        current.map((entry) => (entry.id === localId ? reconciled : entry))
      );
    } catch (error) {
      console.error("Failed to sync new item, queuing for retry", error);
      await enqueueSyncOperation(db, "shopping_list_item_add", {
        listId,
        name: trimmedName,
        quantity: trimmedQuantity,
        category: "Pantry",
      }).catch((queueError) => {
        console.error("Failed to queue new item sync", queueError);
      });
    }
  }

  async function handleRename(name: string) {
    const trimmed = name.trim();
    if (!trimmed) return;

    if (!isOnline) {
      closeSheet();
      showToast("You're offline — connect to rename this list", "danger");
      return;
    }

    try {
      await renameShoppingListMutation.mutateAsync({
        shoppingListId: listId,
        payload: { name: trimmed },
      });
      await renameShoppingListLocal(db, listId, trimmed);
      renameListInStore(listId, trimmed);
      closeSheet();
    } catch (error) {
      closeSheet();
      showToast(getApiErrorMessage(error), "danger");
    }
  }

  async function handleDelete() {
    if (!isOnline) {
      closeSheet();
      showToast("You're offline — connect to delete this list", "danger");
      return;
    }

    try {
      await deleteShoppingListMutation.mutateAsync(listId);
      await deleteShoppingList(db, listId);
      removeListInStore(listId);
      closeSheet();
      router.back();
      showToast("List deleted", "success");
    } catch (error) {
      closeSheet();
      showToast(getApiErrorMessage(error), "danger");
    }
  }

  function openAddItemSheet() {
    openSheet(<AddItemSheet onAdd={handleAddItem} />);
  }

  function openRenameSheet() {
    openSheet(
      <RenameListSheet initialName={list?.name ?? ""} onRename={handleRename} />
    );
  }

  function openMenuSheet() {
    openSheet(
      <View style={styles.sheetContent}>
        <AppText style={styles.sheetTitle}>{list?.name ?? "List"}</AppText>

        <MenuSheetRow
          icon="check"
          label="Clear Checked Items"
          onPress={() => {
            closeSheet();
            handleClearChecked();
          }}
        />
        <MenuSheetRow
          icon="pencil"
          label="Rename Shopping List"
          onPress={() => {
            closeSheet();
            openRenameSheet();
          }}
        />
        <MenuSheetRow
          icon="share"
          label="Share Shopping List"
          onPress={() => {
            closeSheet();
            shareViewShot(shotRef);
          }}
        />
        <MenuSheetRow
          icon="trash"
          label="Delete Shopping List"
          destructive
          onPress={handleDelete}
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
          totalEstimatedCost={totalEstimatedCost}
        />

        <SummaryCard
          listName={list?.name ?? "Shopping List"}
          total={totalEstimatedCost}
          itemCount={items.length}
          checkedCount={checkedCount}
          onToggleSelectAll={handleToggleSelectAll}
        />

        <View style={styles.body}>
          {isLoading ? (
            <ProgressLoader message="Fetching your shopping list..." />
          ) : items.length === 0 ? (
            <ShoppingEmptyState onAddPress={openAddItemSheet} />
          ) : (
            sections.map((section) => (
              <ShoppingListSection
                key={section.category}
                category={section.category}
                items={section.items}
                onToggleItem={handleToggleItem}
              />
            ))
          )}
        </View>

        {!isLoading ? <CheckoutButton /> : null}
      </ScrollView>
    </View>
  );
}

function AddItemSheet({
  onAdd,
}: {
  onAdd: (name: string, quantity: string) => void;
}) {
  const [name, setName] = useState("");
  const [quantity, setQuantity] = useState("");

  return (
    <View style={styles.sheetContent}>
      <AppText style={styles.sheetTitle}>Add Item</AppText>

      <TextInput
        value={name}
        onChangeText={setName}
        placeholder="Item name"
        placeholderTextColor={theme.colors.textMuted}
        style={styles.sheetInput}
        autoFocus
      />

      <TextInput
        value={quantity}
        onChangeText={setQuantity}
        placeholder="Quantity (e.g. 2 cups)"
        placeholderTextColor={theme.colors.textMuted}
        style={styles.sheetInput}
        returnKeyType="done"
        onSubmitEditing={() => onAdd(name, quantity)}
      />

      <Pressable
        onPress={() => onAdd(name, quantity)}
        disabled={!name.trim()}
        style={[
          styles.sheetPrimaryButton,
          !name.trim() && styles.sheetPrimaryButtonDisabled,
        ]}
      >
        <AppText style={styles.sheetPrimaryButtonText}>Add to List</AppText>
      </Pressable>
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
    backgroundColor: theme.colors.white,
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
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.card,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  menuIconButton: {
    shadowColor: theme.colors.text,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.14,
    shadowRadius: 3,
    elevation: 2,
  },
  headerTitle: {
    flex: 1,
    textAlign: "center",
    fontFamily: theme.fontFamily.display,
    fontSize: 18,
    letterSpacing: 0,
    color: theme.colors.navy,
    paddingHorizontal: 10,
  },
  pressed: {
    opacity: 0.85,
  },
  body: {
    paddingHorizontal: 20,
  },
  errorState: {
    gap: theme.spacing.md,
  },
  summaryCard: {
    marginHorizontal: 20,
    marginBottom: 18,
    backgroundColor: theme.colors.navy,
    borderRadius: 20,
    padding: 20,
    shadowColor: theme.colors.navy,
    shadowOffset: { width: 0, height: 22 },
    shadowOpacity: 0.24,
    shadowRadius: 24,
    elevation: 8,
  },
  summaryRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  summaryLeft: {
    flex: 1,
    minWidth: 0,
    flexShrink: 1,
  },
  summaryRight: {
    alignItems: "flex-end",
    marginLeft: 16,
  },
  summaryEyebrow: {
    fontFamily: theme.fontFamily.mono,
    fontSize: 12,
    color: "#9FB0A3",
    letterSpacing: 0,
    textTransform: "uppercase",
    marginBottom: 5,
  },
  summaryName: {
    fontFamily: theme.fontFamily.display,
    fontSize: 17,
    color: theme.colors.onDark,
  },
  summaryTotal: {
    fontFamily: theme.fontFamily.display,
    fontSize: 28,
    lineHeight: 30,
    color: theme.colors.onDark,
  },
  summaryCount: {
    fontFamily: theme.fontFamily.mono,
    fontSize: 13,
    color: "#9FB0A3",
    marginTop: 3,
  },
  summaryProgressTrack: {
    height: 8,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.12)",
    overflow: "hidden",
  },
  summaryProgressFill: {
    height: "100%",
    borderRadius: 999,
    backgroundColor: theme.colors.green,
  },
  summaryFooterRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 9,
  },
  summaryFooterLabel: {
    fontFamily: theme.fontFamily.mono,
    fontSize: 12,
    color: "#9FB0A3",
  },
  summarySelectAll: {
    fontFamily: theme.fontFamily.bodyBold,
    fontSize: 12,
    color: "#7FD9A6",
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
  checkoutButton: {
    marginHorizontal: 20,
    minHeight: 56,
    borderRadius: 999,
    backgroundColor: theme.colors.navy,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 4,
    marginBottom: 20,
    shadowColor: theme.colors.navy,
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.22,
    shadowRadius: 13,
    elevation: 5,
  },
  checkoutButtonText: {
    fontFamily: theme.fontFamily.bodySemiBold,
    fontSize: 15.5,
    color: theme.colors.onDark,
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
    color: theme.colors.linkGreen,
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
  shareCardTotal: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 18,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  shareCardTotalLabel: {
    fontFamily: theme.fontFamily.bodyBold,
    fontSize: 12,
    color: theme.colors.textMuted,
    textTransform: "uppercase",
  },
  shareCardTotalValue: {
    fontFamily: theme.fontFamily.display,
    fontSize: 20,
    color: theme.colors.green,
  },
  shareCardFooter: {
    marginTop: 20,
    textAlign: "center",
    fontFamily: theme.fontFamily.mono,
    fontSize: 10,
    color: theme.colors.textDim,
    textTransform: "uppercase",
    letterSpacing: 0,
  },
});
