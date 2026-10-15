// A recipe batch as app versions before SL-06 queued it: the phone's own
// lines, one per recipe line, with no clientLineId. Phones updating with
// such a batch still in their outbox must send it correctly.
import { insertShoppingListItem } from "../../src/db/shoppingItemRows.ts";
import { enqueueSyncOperation } from "../../src/db/syncQueueRepository.ts";
import { pendingListCreation } from "../../src/lib/shopping/listCommands.ts";

let batches = 0;

export async function queueOldRecipeBatch({ transact }, { listId, recipes, items }) {
  const batchId = `recipe_shopping_old_${++batches}`;
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
        lines: saved.map((item) => ({
          id: item.id,
          recipeId: item.sourceRecipeId ?? null,
          recipeIngredientId: item.recipeIngredientId ?? null,
          ingredientId: item.ingredientId ?? null,
        })),
      },
      { mutationId: batchId, entityId: `recipe_batch:${batchId}`, dependsOn: await pendingListCreation(tx, listId) }
    );
  });
  return saved;
}
