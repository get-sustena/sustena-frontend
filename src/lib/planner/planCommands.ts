// Saved meal plans (MP-01, PRD v6.8 section 18): saving, renaming, swapping
// meals and deleting work offline. Each change is saved on the phone with
// its outbox command in one transaction. Shared by the app and its tests,
// so nothing here imports React Native.
import type { SQLiteDatabase } from "expo-sqlite";
import { resolveSyncIdMapping, saveSyncIdMapping } from "../../db/syncIdMappingRepository.ts";
import { enqueueSyncOperation, type SyncQueueOperation } from "../../db/syncQueueRepository.ts";
import type {
  MealSlot,
  RecipeListItem,
  SavedMealPlan,
  SavedMealPlanCreateRequest,
  SavedMealPlanType,
} from "../../types/api.ts";

export type PlanItem = {
  id: string;
  recipeId: string;
  recipe: RecipeListItem | null;
  day: number;
  mealSlot: MealSlot;
  servings: number;
  estimatedCost: number | null;
};

export type SavedPlan = {
  id: string;
  name: string;
  plannerType: SavedMealPlanType;
  budget: number | null;
  servingSize: number;
  requestedMealCount: number;
  totalEstimatedCost: number | null;
  shortfallReason: string | null;
  recommendedBudget: number | null;
  configuration: Record<string, unknown>;
  items: PlanItem[];
  createdAt: string;
  updatedAt: string;
};

// A plan as the planner makes it, before it's saved.
export type PlanDraft = Omit<SavedPlan, "id" | "name" | "items" | "createdAt" | "updatedAt"> & {
  items: Omit<PlanItem, "id">[];
};

type Dependencies = {
  db: SQLiteDatabase;
  // Runs `work` in one SQLite transaction (the app's runWriteTransaction).
  transact: <T>(work: (db: SQLiteDatabase) => Promise<T>) => Promise<T>;
  now: () => string;
  newId: (prefix: string) => string;
  // Asks the outbox to send what's queued now, if it can.
  requestSync: () => void;
};

// "Meal plan #N": one more than the largest N among the person's plans named
// exactly that way. The server suggests the same.
export function nextPlanName(names: string[]) {
  const numbers = names.flatMap((name) => {
    const match = /^Meal plan #(\d+)$/.exec(name.trim());
    return match ? [Number(match[1])] : [];
  });
  return `Meal plan #${numbers.length ? Math.max(...numbers) + 1 : 1}`;
}

function savedPlanFromServer(plan: SavedMealPlan): SavedPlan {
  return {
    id: plan.id,
    name: plan.name ?? "Meal plan",
    plannerType: plan.plannerType,
    budget: plan.budget,
    servingSize: plan.servingSize,
    requestedMealCount: plan.requestedMealCount,
    totalEstimatedCost: plan.totalEstimatedCost,
    shortfallReason: plan.shortfallReason,
    recommendedBudget: plan.recommendedBudget,
    configuration: plan.configuration,
    items: plan.items.map((item) => ({
      id: item.id,
      recipeId: item.recipeId,
      recipe: item.recipe,
      day: item.day,
      mealSlot: item.mealSlot,
      servings: item.servings,
      estimatedCost: item.estimatedCost,
    })),
    createdAt: plan.createdAt,
    updatedAt: plan.updatedAt,
  };
}

// Most recent first.
// "3 days · 9 meals · ₦16,650" on Saved meal plans and a plan's screen.
export function planSummary(plan: SavedPlan) {
  return {
    days: new Set(plan.items.map((item) => item.day)).size,
    meals: plan.items.length,
    cost: plan.items.reduce((sum, item) => sum + (item.estimatedCost ?? 0), 0),
  };
}

export async function getSavedPlans(db: SQLiteDatabase) {
  const rows = await db.getAllAsync<{ plan_json: string }>(
    "SELECT plan_json FROM meal_plans ORDER BY created_at DESC, rowid DESC"
  );
  return rows.map((row) => JSON.parse(row.plan_json) as SavedPlan);
}

async function getSavedPlan(db: SQLiteDatabase, planId: string) {
  const row = await db.getFirstAsync<{ plan_json: string }>("SELECT plan_json FROM meal_plans WHERE id = ?", [planId]);
  return row ? (JSON.parse(row.plan_json) as SavedPlan) : null;
}

async function writePlan(tx: SQLiteDatabase, plan: SavedPlan) {
  await tx.runAsync(
    `
    INSERT INTO meal_plans (id, name, plan_json, created_at, updated_at) VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      name = excluded.name, plan_json = excluded.plan_json, updated_at = excluded.updated_at
    `,
    [plan.id, plan.name, JSON.stringify(plan), plan.createdAt, plan.updatedAt]
  );
}

// The id a saved plan has now: its own while the phone still has it, the
// server's once it's sent, or null once it's deleted. The row is read first:
// sending a plan swaps the row and writes the server's id in one
// transaction, so a row gone means its server id is there.
export async function currentPlanId(db: SQLiteDatabase, planId: string) {
  if (await getSavedPlan(db, planId)) return planId;
  const serverId = await resolveSyncIdMapping(db, planId, "meal_plan");
  return serverId && (await getSavedPlan(db, serverId)) ? serverId : null;
}

const resolvePlan = async (db: SQLiteDatabase, planId: string) =>
  (await resolveSyncIdMapping(db, planId, "meal_plan")) ?? planId;
const resolveItem = async (db: SQLiteDatabase, itemId: string) =>
  (await resolveSyncIdMapping(db, itemId, "meal_plan_item")) ?? itemId;

// The queued save a plan edit waits for, if the plan isn't on the server yet.
async function pendingPlanCreation(tx: SQLiteDatabase, planId: string) {
  const creation = await tx.getFirstAsync<{ entity_id: string }>(
    "SELECT entity_id FROM sync_queue WHERE kind = 'meal_plan_create' AND entity_id = ? LIMIT 1",
    [planId]
  );
  return creation?.entity_id ?? null;
}

// The two meals trade places, as the server does: each keeps its recipe.
function swapPlaces(plan: SavedPlan, sourceItemId: string, targetItemId: string, at: string): SavedPlan {
  const source = plan.items.find((item) => item.id === sourceItemId);
  const target = plan.items.find((item) => item.id === targetItemId);
  if (!source || !target) return plan;
  return {
    ...plan,
    updatedAt: at,
    items: plan.items.map((item) => {
      if (item.id === source.id) return { ...item, day: target.day, mealSlot: target.mealSlot };
      if (item.id === target.id) return { ...item, day: source.day, mealSlot: source.mealSlot };
      return item;
    }),
  };
}

export function createPlanCommands({ transact, now, newId, requestSync }: Dependencies) {
  return {
    async savePlan({ draft, name }: { draft: PlanDraft; name: string }) {
      const at = now();
      const plan: SavedPlan = {
        ...draft,
        id: newId("meal_plan"),
        name: name.trim(),
        items: draft.items.map((item) => ({ ...item, id: newId("meal_plan_item") })),
        createdAt: at,
        updatedAt: at,
      };
      const clientMutationId = newId("plan_mutation");
      const request: SavedMealPlanCreateRequest = {
        name: plan.name,
        plannerType: plan.plannerType,
        budget: plan.budget,
        servingSize: plan.servingSize,
        requestedMealCount: plan.requestedMealCount,
        totalEstimatedCost: plan.totalEstimatedCost,
        shortfallReason: plan.shortfallReason,
        recommendedBudget: plan.recommendedBudget,
        configuration: plan.configuration,
        items: plan.items.map(({ recipeId, day, mealSlot, servings, estimatedCost }) => ({
          recipeId,
          day,
          mealSlot,
          servings,
          estimatedCost,
        })),
      };
      await transact(async (tx) => {
        await writePlan(tx, plan);
        await enqueueSyncOperation(
          tx,
          "meal_plan_create",
          { planId: plan.id, itemIds: plan.items.map((item) => item.id), request, clientMutationId },
          { mutationId: clientMutationId, entityId: plan.id }
        );
      });
      requestSync();
      return plan;
    },

    async renamePlan({ planId, name }: { planId: string; name: string }) {
      await transact(async (tx) => {
        const id = await resolvePlan(tx, planId);
        const plan = await getSavedPlan(tx, id);
        if (plan) await writePlan(tx, { ...plan, name: name.trim(), updatedAt: now() });
        await enqueueSyncOperation(
          tx,
          "meal_plan_rename",
          { planId: id, name: name.trim() },
          { mutationId: newId("plan_mutation"), entityId: id, dependsOn: await pendingPlanCreation(tx, id) }
        );
      });
      requestSync();
    },

    // A swap saves straight away (PRD section 18), on the phone at once.
    async swapMeals({ planId, sourceItemId, targetItemId }: { planId: string; sourceItemId: string; targetItemId: string }) {
      await transact(async (tx) => {
        const id = await resolvePlan(tx, planId);
        const [source, target] = [await resolveItem(tx, sourceItemId), await resolveItem(tx, targetItemId)];
        const plan = await getSavedPlan(tx, id);
        if (plan) await writePlan(tx, swapPlaces(plan, source, target, now()));
        const clientMutationId = newId("plan_mutation");
        await enqueueSyncOperation(
          tx,
          "meal_plan_swap",
          { planId: id, sourceItemId: source, targetItemId: target, clientMutationId },
          { mutationId: clientMutationId, entityId: id, dependsOn: await pendingPlanCreation(tx, id) }
        );
      });
      requestSync();
    },

    // Gone from the phone at once; the command keeps a copy, so a delete the
    // server refuses can put it back.
    async deletePlan({ planId }: { planId: string }) {
      await transact(async (tx) => {
        const id = await resolvePlan(tx, planId);
        const copy = await getSavedPlan(tx, id);
        await tx.runAsync("DELETE FROM meal_plans WHERE id = ?", [id]);
        await enqueueSyncOperation(
          tx,
          "meal_plan_delete",
          { planId: id, copy },
          { mutationId: newId("plan_mutation"), entityId: id, dependsOn: await pendingPlanCreation(tx, id) }
        );
      });
      requestSync();
    },
  };
}

type PlansApi = {
  createMealPlan: (request: SavedMealPlanCreateRequest & { clientMutationId: string }) => Promise<SavedMealPlan>;
  swapMealPlanItems: (planId: string, sourceItemId: string, targetItemId: string, clientMutationId: string) => Promise<SavedMealPlan>;
  renameMealPlan: (planId: string, change: { name: string }) => Promise<unknown>;
  deleteMealPlan: (planId: string) => Promise<unknown>;
};

type Replay = {
  api: PlansApi;
  transact: <T>(work: (db: SQLiteDatabase) => Promise<T>) => Promise<T>;
};

const statusOf = (error: unknown) =>
  typeof error === "object" && error !== null && "status" in error ? Number((error as { status: unknown }).status) : 0;
const isRefusal = (status: number) => status >= 400 && status < 500 && ![401, 408, 429].includes(status);

// Other edits to the plan still waiting, which the server's copy wouldn't
// show yet.
async function hasOtherPendingEdits(tx: SQLiteDatabase, operationId: string, planId: string) {
  const row = await tx.getFirstAsync<{ id: string }>(
    "SELECT id FROM sync_queue WHERE entity_id = ? AND id != ? AND kind LIKE 'meal_plan_%' LIMIT 1",
    [planId, operationId]
  );
  return row !== null;
}

// Sends one plan command from the outbox. Returns false for commands it
// doesn't handle.
export async function runPlanCommand(db: SQLiteDatabase, operation: SyncQueueOperation, { api, transact }: Replay) {
  const payload = operation.payload as {
    planId: string;
    name?: string;
    itemIds?: string[];
    request?: SavedMealPlanCreateRequest;
    clientMutationId?: string;
    sourceItemId?: string;
    targetItemId?: string;
    copy?: SavedPlan | null;
  };
  if (!operation.kind.startsWith("meal_plan_")) return false;
  const planId = await resolvePlan(db, payload.planId);

  switch (operation.kind) {
    case "meal_plan_create": {
      const created = await api.createMealPlan({ ...payload.request!, clientMutationId: payload.clientMutationId! });
      // The plan and its meals take the server's ids; what the phone shows
      // stays, so a swap made meanwhile isn't undone.
      await transact(async (tx) => {
        const local = await getSavedPlan(tx, payload.planId);
        const unused = [...created.items];
        const itemIds = new Map<string, string>();
        for (const [index, localId] of (payload.itemIds ?? []).entries()) {
          const request = payload.request!.items[index];
          const match = unused.findIndex(
            (item) => item.day === request.day && item.mealSlot === request.mealSlot && item.recipeId === request.recipeId
          );
          const [serverItem] = unused.splice(match >= 0 ? match : 0, 1);
          if (!serverItem) continue;
          itemIds.set(localId, serverItem.id);
          await saveSyncIdMapping(tx, localId, serverItem.id, "meal_plan_item");
        }
        await saveSyncIdMapping(tx, payload.planId, created.id, "meal_plan");
        await tx.runAsync("DELETE FROM meal_plans WHERE id = ?", [payload.planId]);
        if (local) {
          await writePlan(tx, {
            ...local,
            id: created.id,
            items: local.items.map((item) => ({ ...item, id: itemIds.get(item.id) ?? item.id })),
          });
        }
      });
      return true;
    }

    case "meal_plan_swap": {
      try {
        const updated = await api.swapMealPlanItems(
          planId,
          await resolveItem(db, payload.sourceItemId!),
          await resolveItem(db, payload.targetItemId!),
          payload.clientMutationId!
        );
        await transact(async (tx) => {
          if (!(await hasOtherPendingEdits(tx, operation.id, planId))) await writePlan(tx, savedPlanFromServer(updated));
        });
      } catch (error) {
        // The plan was deleted meanwhile: nothing left to swap.
        if (statusOf(error) !== 404) throw error;
      }
      return true;
    }

    case "meal_plan_rename":
      await api.renameMealPlan(planId, { name: payload.name! });
      return true;

    case "meal_plan_delete":
      try {
        await api.deleteMealPlan(planId);
      } catch (error) {
        const status = statusOf(error);
        if (status === 404) return true;
        if (!isRefusal(status)) throw error;
        // Refused: the plan comes back as it was.
        if (payload.copy) await transact((tx) => writePlan(tx, { ...payload.copy!, id: planId }));
      }
      return true;

    default:
      return false;
  }
}

const PLAN_KINDS = ["meal_plan_create", "meal_plan_rename", "meal_plan_swap", "meal_plan_delete"];

// Saves the server's plans (QAD-01) and returns them as saved, most recent
// first. Plan edits still in the outbox win: a plan saved on the phone
// stays, a rename or swap shows as the phone has it, a plan being deleted
// stays hidden.
export async function replacePlansKeepingPendingEdits(tx: SQLiteDatabase, serverPlans: SavedMealPlan[]) {
  const local = new Map((await getSavedPlans(tx)).map((plan) => [plan.id, plan]));
  const plans = new Map(serverPlans.map((plan) => [plan.id, savedPlanFromServer(plan)]));
  const operations = await tx.getAllAsync<{ kind: string; payload_json: string }>(
    `
    SELECT kind, payload_json FROM sync_queue
    WHERE kind IN (${PLAN_KINDS.map(() => "?").join(", ")})
    ORDER BY created_at ASC, rowid ASC
    `,
    PLAN_KINDS
  );
  for (const operation of operations) {
    const { planId } = JSON.parse(operation.payload_json) as { planId: string };
    const id = await resolvePlan(tx, planId);
    if (operation.kind === "meal_plan_delete") {
      plans.delete(id);
      continue;
    }
    // The phone's copy has the edit; the reply may not.
    const copy = local.get(id);
    if (copy) plans.set(id, copy);
  }

  await tx.runAsync("DELETE FROM meal_plans");
  for (const plan of plans.values()) await writePlan(tx, plan);
  return getSavedPlans(tx);
}
