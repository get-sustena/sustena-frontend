// app/(tabs)/shopping.tsx

import { useSQLiteContext } from "expo-sqlite";
import { Pressable, StyleSheet, View } from "react-native";
import { ShoppingListSection } from "../../src/components/shopping/ShoppingListSection";
import { AppText } from "../../src/components/ui/AppText";
import { EmptyState } from "../../src/components/ui/EmptyState";
import { Button } from "../../src/components/ui/Button";
import { Screen } from "../../src/components/ui/Screen";
import {
  deleteCheckedShoppingListItems,
  updateShoppingListItemChecked,
} from "../../src/db/shoppingListRepository";
import {
  useClearCheckedShoppingListItemsMutation,
  useShoppingListQuery,
  useUpdateShoppingListItemMutation,
} from "../../src/hooks/api/useShoppingList";
import { apiShoppingItemToLocalItem } from "../../src/lib/api/adapters";
import { getApiErrorMessage } from "../../src/lib/api/errors";
import { formatNaira } from "../../src/lib/formatters";
import { groupShoppingListItems } from "../../src/lib/groupShoppingListItems";
import { useShoppingListStore } from "../../src/store/shoppingListStore";
import { theme } from "../../src/theme/theme";

export default function ShoppingScreen() {
  const db = useSQLiteContext();

  const items = useShoppingListStore((state) => state.items);
  const toggleItem = useShoppingListStore((state) => state.toggleItem);
  const clearCheckedItems = useShoppingListStore(
    (state) => state.clearCheckedItems
  );
  const shoppingListQuery = useShoppingListQuery();
  const updateShoppingItemMutation = useUpdateShoppingListItemMutation();
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
  const progress =
    visibleItemCount > 0 ? visibleCheckedCount / visibleItemCount : 0;

  async function handleToggleItem(itemId: string) {
    const item = visibleItems.find((currentItem) => currentItem.id === itemId);

    if (!item) return;

    try {
      if (apiItems.length > 0) {
        await updateShoppingItemMutation.mutateAsync({
          itemId,
          payload: {
            checked: !item.checked,
          },
        });
      }

      // TODO: merge backend shopping changes into an offline sync queue.
      toggleItem(itemId);
      await updateShoppingListItemChecked(db, itemId, !item.checked);
    } catch (error) {
      console.error("Failed to update shopping item", error);
    }
  }

  async function handleClearCheckedItems() {
    try {
      if (apiItems.length > 0) {
        await clearCheckedMutation.mutateAsync();
      }

      // TODO: merge backend clear into an offline sync queue.
      clearCheckedItems();
      await deleteCheckedShoppingListItems(db);
    } catch (error) {
      console.error("Failed to delete checked shopping items", error);
    }
  }

  return (
    <Screen scroll>
      <Decorations />

      <View style={styles.header}>
        <View>
          <AppText style={styles.eyebrow}>SHOPPING LIST</AppText>
          <AppText style={styles.title}>Ready to shop? 🛒</AppText>
        </View>

        <Pressable
          onPress={handleClearCheckedItems}
          disabled={visibleCheckedCount === 0 || clearCheckedMutation.isPending}
          style={({ pressed }) => [
            styles.iconButton,
            pressed && styles.pressed,
            visibleCheckedCount === 0 && styles.disabled,
          ]}
        >
          <AppText style={styles.iconText}>🗑️</AppText>
        </Pressable>
      </View>

      <View style={styles.summaryCard}>
        <View style={styles.summaryRow}>
          <View>
            <AppText style={styles.summaryLabel}>Active list</AppText>
            <AppText style={styles.summaryTitle}>Current Shopping List</AppText>
          </View>

          <View style={styles.summaryRight}>
            <AppText style={styles.summaryAmount}>
              {formatNaira(visibleTotalEstimatedCost)}
            </AppText>
            <AppText style={styles.summaryItems}>
              {visibleItemCount} {visibleItemCount === 1 ? "item" : "items"}
            </AppText>
          </View>
        </View>

        <View style={styles.progressTrack}>
          <View
            style={[
              styles.progressFill,
              {
                width: `${progress * 100}%`,
              },
            ]}
          />
        </View>

        <AppText style={styles.progressLabel}>
          {visibleCheckedCount} of {visibleItemCount} items ticked off
        </AppText>
      </View>

      {shoppingListQuery.isLoading ? (
        <EmptyState
          icon="🛒"
          title="Loading shopping list"
          message="Fetching your active list."
        />
      ) : shoppingListQuery.isError && visibleItemCount === 0 ? (
        <View style={styles.errorState}>
          <EmptyState
            icon="⚠️"
            title="Could not load list"
            message={getApiErrorMessage(shoppingListQuery.error)}
          />
          <Button title="Try again" onPress={() => shoppingListQuery.refetch()} />
        </View>
      ) : visibleItemCount === 0 ? (
        <EmptyState
          icon="🛒"
          title="Your shopping list is empty"
          message={
            "Open a recipe and tap “Add to Shopping List” to get started."
          }
        />
      ) : (
        <>
          {sections.map((section) => (
            <ShoppingListSection
              key={section.category}
              category={section.category}
              items={section.items}
              onToggleItem={handleToggleItem}
            />
          ))}

          <View style={styles.checkoutWrapper}>
            <Pressable
              onPress={() => {
                // Placeholder. We will connect this later.
              }}
              style={({ pressed }) => [
                styles.golemonButton,
                pressed && styles.pressed,
              ]}
            >
              <AppText style={styles.golemonLogo}>🍋</AppText>

              <View style={styles.golemonTextWrap}>
                <AppText style={styles.golemonLabel}>POWERED BY</AppText>
                <AppText style={styles.golemonTitle}>
                  Checkout with GoLemon
                </AppText>
              </View>

              <AppText style={styles.golemonArrow}>→</AppText>
            </Pressable>
          </View>
        </>
      )}
    </Screen>
  );
}

function Decorations() {
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <AppText style={[styles.deco, styles.decoLemon]}>🍋</AppText>
      <AppText style={[styles.deco, styles.decoCart]}>🛒</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 24,
    paddingTop: 52,
    paddingBottom: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  eyebrow: {
    fontFamily: theme.fontFamily.bodyBold,
    fontSize: 10,
    color: theme.colors.textMuted,
    letterSpacing: 2,
    textTransform: "uppercase",
    marginBottom: 3,
  },
  title: {
    fontFamily: theme.fontFamily.display,
    fontSize: 24,
    lineHeight: 28,
    color: theme.colors.navy,
  },
  iconButton: {
    width: 42,
    height: 42,
    borderRadius: 13,
    backgroundColor: theme.colors.surface,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  iconText: {
    fontSize: 18,
  },
  pressed: {
    opacity: 0.82,
    transform: [{ scale: 0.98 }],
  },
  disabled: {
    opacity: 0.35,
  },
  errorState: {
    marginHorizontal: 20,
    gap: theme.spacing.md,
  },
  summaryCard: {
    marginHorizontal: 20,
    marginBottom: theme.spacing.xl,
    backgroundColor: theme.colors.navy,
    borderRadius: theme.radius.lg,
    padding: 20,
    overflow: "hidden",
  },
  summaryRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
  },
  summaryLabel: {
    fontFamily: theme.fontFamily.bodyBold,
    fontSize: 10,
    color: theme.colors.onDark2,
    letterSpacing: 1.5,
    textTransform: "uppercase",
    marginBottom: 4,
  },
  summaryTitle: {
    fontFamily: theme.fontFamily.display,
    fontSize: 15,
    color: theme.colors.onDark,
  },
  summaryRight: {
    alignItems: "flex-end",
  },
  summaryAmount: {
    fontFamily: theme.fontFamily.display,
    fontSize: 28,
    color: theme.colors.onDark,
  },
  summaryItems: {
    fontFamily: theme.fontFamily.body,
    fontSize: 11,
    color: theme.colors.onDark2,
  },
  progressTrack: {
    height: 5,
    backgroundColor: "rgba(245,237,218,0.18)",
    borderRadius: 3,
    overflow: "hidden",
    marginTop: theme.spacing.lg,
  },
  progressFill: {
    height: "100%",
    backgroundColor: theme.colors.orange,
    borderRadius: 3,
  },
  progressLabel: {
    fontFamily: theme.fontFamily.body,
    fontSize: 11,
    color: theme.colors.onDark2,
    marginTop: 6,
  },
  checkoutWrapper: {
    marginHorizontal: 20,
    marginTop: theme.spacing.sm,
    marginBottom: theme.spacing["3xl"],
  },
  golemonButton: {
    width: "100%",
    minHeight: 58,
    borderRadius: 16,
    backgroundColor: theme.colors.green,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: theme.spacing.lg,
    gap: theme.spacing.md,
  },
  golemonLogo: {
    fontSize: 24,
  },
  golemonTextWrap: {
    flex: 1,
  },
  golemonLabel: {
    fontFamily: theme.fontFamily.bodyBold,
    fontSize: 9,
    color: "rgba(255,255,255,0.6)",
    letterSpacing: 1.5,
    textTransform: "uppercase",
  },
  golemonTitle: {
    fontFamily: theme.fontFamily.bodyBold,
    fontSize: 14,
    color: theme.colors.white,
    marginTop: 1,
  },
  golemonArrow: {
    fontSize: 18,
    color: "rgba(255,255,255,0.7)",
  },
  deco: {
    position: "absolute",
    opacity: 0.08,
  },
  decoLemon: {
    top: "10%",
    right: "8%",
    fontSize: 38,
    transform: [{ rotate: "14deg" }],
  },
  decoCart: {
    bottom: "14%",
    left: "4%",
    fontSize: 34,
    transform: [{ rotate: "-16deg" }],
  },
});
