// Shared by the app and its tests, so nothing here imports React Native.
import type { SQLiteDatabase } from "expo-sqlite";
import { insertShoppingListItem, updateShoppingListItemChecked } from "../../db/shoppingItemRows.ts";
import { resolveSyncIdMapping } from "../../db/syncIdMappingRepository.ts";
import { enqueueSyncOperation } from "../../db/syncQueueRepository.ts";
import type { ShoppingListItem } from "../../types/shoppingList.ts";
import { structureShoppingQuantity } from "../shoppingQuantity.ts";

// Shopping list edits (QAD-02, QAD-04). Each one saves the change on the
// device and its outbox command in one transaction, before any request, so
// an edit is never saved without the command that sends it, or the other
// way round. The outbox sends it (shoppingReplay.ts); screens don't call the
// server for these edits themselves.

type Dependencies = {
  db: SQLiteDatabase;
  // Runs `work` in one SQLite transaction (the app's runWriteTransaction).
  transact: <T>(work: (db: SQLiteDatabase) => Promise<T>) => Promise<T>;
  now: () => string;
  newId: (prefix: string) => string;
  // Asks the outbox to send what's queued now, if it can.
  requestSync: () => void;
};

type NewItem = {
  listId: string;
  name: string;
  quantity: string;
  ingredientId?: string;
  category?: string;
};

export function createShoppingCommands({ db, transact, now, newId, requestSync }: Dependencies) {
  // The item's current id, and whether its creation is still waiting in
  // the outbox.
  async function lookUp(tx: SQLiteDatabase, itemId: string) {
    const id = (await resolveSyncIdMapping(tx, itemId, "shopping_list_item")) ?? itemId;
    const creation = await tx.getFirstAsync<{ id: string }>(
      "SELECT id FROM sync_queue WHERE kind = 'shopping_list_item_add' AND entity_id = ? LIMIT 1",
      [id]
    );
    return { id, pendingCreation: creation !== null };
  }

  async function queueCheck(tx: SQLiteDatabase, listId: string, id: string, checked: boolean, pendingCreation: boolean) {
    await enqueueSyncOperation(
      tx,
      "shopping_list_item_toggle",
      { listId, itemId: id, checked },
      { mutationId: newId("shopping_mutation"), entityId: id, dependsOn: pendingCreation ? id : null }
    );
  }

  return {
    // Shows at once under a temporary id; the outbox swaps in the server's
    // id when the item reaches the server. Its mutation id stays the same
    // across retries, so a retry after a lost reply can't add it twice.
    async addItem({ listId, name, quantity, ingredientId, category = "Pantry" }: NewItem) {
      const at = now();
      const structured = structureShoppingQuantity(quantity.trim() || "1");
      const item: ShoppingListItem = {
        id: newId("shopping_item"),
        ingredientId,
        name: name.trim(),
        emoji: "🛒",
        quantity: structured.displayQuantity,
        amount: structured.amount ?? undefined,
        displayQuantity: structured.displayQuantity,
        unit: structured.unit ?? undefined,
        category,
        estimatedPrice: null,
        priceStatus: "unknown",
        clientMutationId: newId("shopping_mutation"),
        checked: false,
        createdAt: at,
        updatedAt: at,
        listId,
      };

      await transact(async (tx) => {
        await insertShoppingListItem(tx, item);
        await enqueueSyncOperation(
          tx,
          "shopping_list_item_add",
          {
            listId,
            temporaryId: item.id,
            ingredientId,
            name: item.name,
            quantity: structured.quantity,
            amount: structured.amount,
            displayQuantity: structured.displayQuantity,
            unit: structured.unit,
            category,
            clientMutationId: item.clientMutationId,
          },
          { mutationId: item.clientMutationId, entityId: item.id }
        );
      });
      requestSync();
      return item;
    },

    // An item still waiting to reach the server is checked locally now, and
    // its check is sent once the item exists there (F03).
    async setChecked({ listId, itemId, checked }: { listId: string; itemId: string; checked: boolean }) {
      await transact(async (tx) => {
        const { id, pendingCreation } = await lookUp(tx, itemId);
        await updateShoppingListItemChecked(tx, id, checked, now());
        await queueCheck(tx, listId, id, checked, pendingCreation);
      });
      requestSync();
    },

    // Select all / deselect all. Items already on the server go in one
    // request; items still waiting to reach it are checked one by one once
    // they exist there.
    async setManyChecked({ listId, itemIds, checked }: { listId: string; itemIds: string[]; checked: boolean }) {
      if (!itemIds.length) return;
      await transact(async (tx) => {
        const onServer: string[] = [];
        const waiting: string[] = [];
        for (const itemId of itemIds) {
          const { id, pendingCreation } = await lookUp(tx, itemId);
          await updateShoppingListItemChecked(tx, id, checked, now());
          (pendingCreation ? waiting : onServer).push(id);
        }
        if (onServer.length) {
          await enqueueSyncOperation(
            tx,
            "shopping_list_items_set_checked",
            { listId, itemIds: onServer, checked },
            { mutationId: newId("shopping_mutation") }
          );
        }
        for (const id of waiting) await queueCheck(tx, listId, id, checked, true);
      });
      requestSync();
    },
  };
}
