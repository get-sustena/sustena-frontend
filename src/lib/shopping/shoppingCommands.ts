// Shared by the app and its tests, so nothing here imports React Native.
import type { SQLiteDatabase } from "expo-sqlite";
import {
  deleteShoppingListItem,
  insertShoppingListItem,
  mapShoppingListRowToItem,
  updateShoppingListItemChecked,
  type ShoppingListItemRow,
} from "../../db/shoppingItemRows.ts";
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

type RecipeSelection = {
  recipeId: string;
  servings: number;
  unitOverrides?: { ingredientId: string; unit: string }[];
};

// The outbox entity a recipe batch creates: all its items at once.
const recipeBatchEntity = (batchId: string) => `recipe_batch:${batchId}`;

export function createShoppingCommands({ db, transact, now, newId, requestSync }: Dependencies) {
  // The item's current id, and the queued creation it waits for, if any: its
  // own add, or the recipe batch that brings it (F03).
  async function lookUp(tx: SQLiteDatabase, itemId: string) {
    const id = (await resolveSyncIdMapping(tx, itemId, "shopping_list_item")) ?? itemId;
    const creation = await tx.getFirstAsync<{ entity_id: string }>(
      `
      SELECT entity_id FROM sync_queue
      WHERE (kind = 'shopping_list_item_add' AND entity_id = ?)
         OR (kind = 'shopping_list_recipe_batch' AND mutation_id = (
              SELECT recipe_batch_id FROM shopping_list_items WHERE id = ?
            ))
      LIMIT 1
      `,
      [id, id]
    );
    return { id, waitFor: creation?.entity_id ?? null };
  }

  async function queueCheck(tx: SQLiteDatabase, listId: string, id: string, checked: boolean, waitFor: string | null) {
    await enqueueSyncOperation(
      tx,
      "shopping_list_item_toggle",
      { listId, itemId: id, checked },
      { mutationId: newId("shopping_mutation"), entityId: id, dependsOn: waitFor }
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

    // A recipe's (or several recipes') ingredients, as the phone works them
    // out, shown at once. The server adds its own lines, merging any it
    // already has; the outbox then points each local line at the server's
    // row (QAD-02, F03).
    async addRecipes({ listId, recipes, items }: { listId: string; recipes: RecipeSelection[]; items: ShoppingListItem[] }) {
      const batchId = newId("recipe_shopping");
      const saved = items.map((item) => ({ ...item, listId, recipeBatchId: batchId }));
      await transact(async (tx) => {
        for (const item of saved) await insertShoppingListItem(tx, item);
        await enqueueSyncOperation(
          tx,
          "shopping_list_recipe_batch",
          {
            listId,
            clientMutationId: batchId,
            recipes,
            lines: saved.map(({ id, ingredientId, name }) => ({ id, ingredientId: ingredientId ?? null, name })),
          },
          { mutationId: batchId, entityId: recipeBatchEntity(batchId) }
        );
      });
      requestSync();
      return saved;
    },

    // An item still waiting to reach the server is checked locally now, and
    // its check is sent once the item exists there (F03).
    async setChecked({ listId, itemId, checked }: { listId: string; itemId: string; checked: boolean }) {
      await transact(async (tx) => {
        const { id, waitFor } = await lookUp(tx, itemId);
        await updateShoppingListItemChecked(tx, id, checked, now());
        await queueCheck(tx, listId, id, checked, waitFor);
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
        const waiting: { id: string; waitFor: string }[] = [];
        for (const itemId of itemIds) {
          const { id, waitFor } = await lookUp(tx, itemId);
          await updateShoppingListItemChecked(tx, id, checked, now());
          if (waitFor) waiting.push({ id, waitFor });
          else onServer.push(id);
        }
        if (onServer.length) {
          await enqueueSyncOperation(
            tx,
            "shopping_list_items_set_checked",
            { listId, itemIds: onServer, checked },
            { mutationId: newId("shopping_mutation") }
          );
        }
        for (const { id, waitFor } of waiting) await queueCheck(tx, listId, id, checked, waitFor);
      });
      requestSync();
    },

    // Removes the item from the phone at once; the server removes it once
    // it exists there. Returns the item, for Undo.
    async removeItem({ listId, itemId }: { listId: string; itemId: string }) {
      const removed = await transact(async (tx) => {
        const { id, waitFor } = await lookUp(tx, itemId);
        const row = await tx.getFirstAsync<ShoppingListItemRow>(
          "SELECT * FROM shopping_list_items WHERE id = ?",
          [id]
        );
        await deleteShoppingListItem(tx, id);
        await enqueueSyncOperation(
          tx,
          "shopping_list_item_remove",
          { listId, itemId: id },
          { mutationId: newId("shopping_mutation"), entityId: id, dependsOn: waitFor }
        );
        return row ? mapShoppingListRowToItem(row) : null;
      });
      requestSync();
      return removed;
    },

    // Undo for removeItem. A removal not sent yet is simply cancelled;
    // one already sent is reversed on the server.
    async undoRemove({ listId, item }: { listId: string; item: ShoppingListItem | null }) {
      if (!item) return;
      const restoreOnServer = await transact(async (tx) => {
        const { id } = await lookUp(tx, item.id);
        const unsent = await tx.getFirstAsync<{ id: string }>(
          `
          SELECT id FROM sync_queue
          WHERE kind = 'shopping_list_item_remove' AND entity_id = ? AND needs_attention = 0
          ORDER BY created_at DESC, rowid DESC
          LIMIT 1
          `,
          [id]
        );
        await insertShoppingListItem(tx, { ...item, id, listId });
        if (unsent) {
          await tx.runAsync("DELETE FROM sync_queue WHERE id = ?", [unsent.id]);
          return false;
        }
        await enqueueSyncOperation(
          tx,
          "shopping_list_item_restore",
          { listId, itemId: id },
          { mutationId: newId("shopping_mutation"), entityId: id }
        );
        return true;
      });
      if (restoreOnServer) requestSync();
    },

    // "Remove checked items": gone from the phone at once; the server
    // clears the same items after the checks queued before it.
    async clearChecked({ listId }: { listId: string }) {
      await transact(async (tx) => {
        await tx.runAsync("DELETE FROM shopping_list_items WHERE list_id = ? AND checked = 1", [listId]);
        await enqueueSyncOperation(
          tx,
          "shopping_list_clear_checked",
          { listId },
          { mutationId: newId("shopping_mutation") }
        );
      });
      requestSync();
    },
  };
}
