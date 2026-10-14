// "Changes not saved" (F02): edits the server refused are kept rather than
// lost, and here the person can retry them or drop them. Changes waiting on
// a refused one stay blocked until it's fixed or dropped. Shared by the app
// and its tests, so nothing here imports React Native.
import type { SQLiteDatabase } from "expo-sqlite";
import { cookedDayKey } from "../../db/cookedRecipesRepository.ts";
import { resolveSyncIdMapping } from "../../db/syncIdMappingRepository.ts";
import { getLagosDay } from "../lagosDay.ts";

type OutboxRow = {
  id: string;
  kind: string;
  payload_json: string;
  entity_id: string | null;
  depends_on: string | null;
  needs_attention: number;
  last_error: string | null;
};

type Payload = {
  listId?: string;
  temporaryId?: string;
  name?: string;
  itemId?: string;
  itemIds?: string[];
  checked?: boolean;
  clientMutationId?: string;
  recipeId?: string;
  userId?: string;
  cookedAt?: string;
};

export type UnsavedChange = {
  id: string;
  title: string;
  // Shown under a refused change; null for a change waiting on another one.
  // The server's own message stays in last_error: it's written for
  // developers, not for the person using the app.
  reason: string | null;
  // The refused change this one waits for.
  waitingOn: string | null;
};

async function outboxRows(db: SQLiteDatabase) {
  return db.getAllAsync<OutboxRow>(
    `
    SELECT id, kind, payload_json, entity_id, depends_on, needs_attention, last_error
    FROM sync_queue
    ORDER BY created_at ASC, rowid ASC
    `
  );
}

// The refused changes, each followed by the changes blocked behind it.
function blockedGroups(rows: OutboxRow[]) {
  const blockerOf = new Map<string, OutboxRow>();
  const listed: { row: OutboxRow; waitingOn: OutboxRow | null }[] = [];
  for (const row of rows) {
    const blocker = row.depends_on ? blockerOf.get(row.depends_on) : undefined;
    if (!row.needs_attention && !blocker) continue;
    const refused = row.needs_attention ? row : blocker!;
    listed.push({ row, waitingOn: row.needs_attention ? null : refused });
    if (row.entity_id) blockerOf.set(row.entity_id, refused);
  }
  return listed;
}

async function itemName(db: SQLiteDatabase, itemId: string | undefined) {
  if (!itemId) return "an item";
  const id = (await resolveSyncIdMapping(db, itemId, "shopping_list_item")) ?? itemId;
  const row = await db.getFirstAsync<{ name: string }>("SELECT name FROM shopping_list_items WHERE id = ?", [id]);
  return row?.name ?? "an item";
}

async function recipeName(db: SQLiteDatabase, recipeId: string | undefined) {
  const row = recipeId
    ? await db.getFirstAsync<{ name: string }>("SELECT name FROM recipes WHERE id = ?", [recipeId])
    : null;
  return row?.name ?? "a recipe";
}

async function describe(db: SQLiteDatabase, kind: string, payload: Payload) {
  switch (kind) {
    case "shopping_list_item_add":
      return `Add ${payload.name ?? "an item"} to your shopping list`;
    case "shopping_list_recipe_batch":
      return "Add a recipe's ingredients to your shopping list";
    case "shopping_list_item_toggle":
      return `${payload.checked ? "Tick" : "Untick"} ${await itemName(db, payload.itemId)}`;
    case "shopping_list_items_set_checked":
      return `${payload.checked ? "Tick" : "Untick"} ${payload.itemIds?.length ?? 0} items`;
    case "shopping_list_item_remove":
      return `Remove ${await itemName(db, payload.itemId)} from your shopping list`;
    case "shopping_list_item_restore":
      return `Put ${await itemName(db, payload.itemId)} back on your shopping list`;
    case "shopping_list_clear_checked":
      return "Remove checked items from your shopping list";
    case "favorite_add":
      return `Save ${await recipeName(db, payload.recipeId)}`;
    case "favorite_remove":
      return `Remove ${await recipeName(db, payload.recipeId)} from Saved`;
    case "recipe_cooked":
      return `Mark ${await recipeName(db, payload.recipeId)} as cooked`;
    case "profile_answers_update":
      return "Update your profile answers";
    case "planner_settings_update":
      return "Update your meal plan settings";
    default:
      return "A change";
  }
}

export async function listUnsavedChanges(db: SQLiteDatabase): Promise<UnsavedChange[]> {
  const changes: UnsavedChange[] = [];
  for (const { row, waitingOn } of blockedGroups(await outboxRows(db))) {
    changes.push({
      id: row.id,
      title: await describe(db, row.kind, JSON.parse(row.payload_json) as Payload),
      reason: waitingOn ? null : "Your account didn't accept this change.",
      waitingOn: waitingOn?.id ?? null,
    });
  }
  return changes;
}

// Sends a refused change again on the next run, as if it were new.
export async function retryChange(db: SQLiteDatabase, id: string) {
  await db.runAsync(
    `
    UPDATE sync_queue
    SET needs_attention = 0, last_error = NULL, next_attempt_at = NULL, attempts = 0
    WHERE id = ?
    `,
    [id]
  );
}

// What a change did on the phone, undone as far as the phone can tell.
async function undoOnPhone(tx: SQLiteDatabase, kind: string, payload: Payload) {
  const resolve = async (id: string) => (await resolveSyncIdMapping(tx, id, "shopping_list_item")) ?? id;
  switch (kind) {
    case "shopping_list_item_add":
      if (payload.temporaryId) await tx.runAsync("DELETE FROM shopping_list_items WHERE id = ?", [payload.temporaryId]);
      return;
    case "shopping_list_recipe_batch":
      await tx.runAsync("DELETE FROM shopping_list_items WHERE recipe_batch_id = ?", [payload.clientMutationId ?? ""]);
      return;
    case "shopping_list_item_toggle":
    case "shopping_list_items_set_checked":
      for (const itemId of payload.itemIds ?? [payload.itemId!]) {
        await tx.runAsync("UPDATE shopping_list_items SET checked = ? WHERE id = ?", [
          payload.checked ? 0 : 1,
          await resolve(itemId),
        ]);
      }
      return;
    case "favorite_add":
      await tx.runAsync("DELETE FROM favorite_recipes WHERE recipe_id = ?", [payload.recipeId ?? ""]);
      return;
    case "favorite_remove":
      await tx.runAsync(
        "INSERT INTO favorite_recipes (recipe_id, created_at, updated_at) VALUES (?, ?, ?) ON CONFLICT(recipe_id) DO NOTHING",
        [payload.recipeId ?? "", new Date().toISOString(), new Date().toISOString()]
      );
      return;
    case "recipe_cooked":
      // "Cooked today" goes back to "I cooked it" for that day.
      if (payload.userId && payload.recipeId && payload.cookedAt) {
        await tx.runAsync("DELETE FROM local_metadata WHERE key = ? AND value = ?", [
          cookedDayKey(payload.userId, payload.recipeId),
          getLagosDay(new Date(payload.cookedAt)),
        ]);
      }
      return;
    // Removals and settings need nothing: the server's copy comes back on
    // the next refresh.
    default:
      return;
  }
}

// Drops a refused change and every change waiting on it, and undoes them on
// the phone. Run it inside a transaction.
export async function discardChange(tx: SQLiteDatabase, id: string) {
  const rows = await outboxRows(tx);
  const dropped = new Set<string>();
  const droppedEntities = new Set<string>();
  for (const row of rows) {
    const isTarget = row.id === id;
    const waitsOnDropped = row.depends_on !== null && droppedEntities.has(row.depends_on);
    if (!isTarget && !waitsOnDropped) continue;
    dropped.add(row.id);
    if (row.entity_id) droppedEntities.add(row.entity_id);
  }
  // Newest first, so a later change is undone before the one it built on.
  for (const row of [...rows].reverse()) {
    if (!dropped.has(row.id)) continue;
    await undoOnPhone(tx, row.kind, JSON.parse(row.payload_json) as Payload);
    await tx.runAsync("DELETE FROM sync_queue WHERE id = ?", [row.id]);
  }
}
