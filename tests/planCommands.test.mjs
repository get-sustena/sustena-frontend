import assert from "node:assert/strict";
import { test } from "node:test";
import {
  createPlanCommands,
  currentPlanId,
  getSavedPlans,
  nextPlanName,
  replacePlansKeepingPendingEdits,
  runPlanCommand,
} from "../src/lib/planner/planCommands.ts";
import { replayOutbox } from "../src/lib/sync/outboxReplay.ts";
import { openTestDatabase, testDatabasePath } from "./helpers/sqlite.mjs";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const recipe = (id) => ({ id, name: id, imageUrl: null });

// A two-day plan as the planner makes it: breakfast and dinner each day.
const DRAFT = {
  plannerType: "budget",
  budget: 20000,
  servingSize: 2,
  requestedMealCount: 4,
  totalEstimatedCost: 16650,
  shortfallReason: null,
  recommendedBudget: null,
  configuration: { days: 2, mealSlots: ["breakfast", "dinner"] },
  items: [
    { recipeId: "pap", recipe: recipe("pap"), day: 1, mealSlot: "breakfast", servings: 2, estimatedCost: 300 },
    { recipeId: "jollof", recipe: recipe("jollof"), day: 1, mealSlot: "dinner", servings: 2, estimatedCost: 6000 },
    { recipeId: "akara", recipe: recipe("akara"), day: 2, mealSlot: "breakfast", servings: 2, estimatedCost: 1200 },
    { recipeId: "egusi", recipe: recipe("egusi"), day: 2, mealSlot: "dinner", servings: 2, estimatedCost: 9150 },
  ],
};

// Plans like the server: the same clientMutationId again returns the plan
// already made, and a swap replayed never swaps back.
function fakeServer({ refuseDelete = null } = {}) {
  const plans = new Map();
  const swaps = new Set();
  const calls = [];
  let next = 1;
  let loseNextReply = false;
  const uuid = () => `00000000-0000-4000-8000-${String(next++).padStart(12, "0")}`;
  const own = (planId) => {
    if (!UUID.test(planId) || !plans.has(planId)) throw Object.assign(new Error("Not found"), { status: 404 });
    return plans.get(planId);
  };
  const reply = (plan) => structuredClone(plan);
  const maybeLose = () => {
    if (loseNextReply) {
      loseNextReply = false;
      throw Object.assign(new Error("timeout"), { status: 0 });
    }
  };
  return {
    plans,
    calls,
    loseNextReply: () => (loseNextReply = true),
    api: {
      async createMealPlan(request) {
        calls.push(["create", request.name]);
        let plan = [...plans.values()].find((existing) => existing.clientMutationId === request.clientMutationId);
        if (!plan) {
          plan = {
            ...request,
            id: uuid(),
            items: request.items.map((item, position) => ({ ...item, id: uuid(), position, recipe: recipe(item.recipeId) })),
            createdAt: "2026-10-14T12:00:00Z",
            updatedAt: "2026-10-14T12:00:00Z",
          };
          plans.set(plan.id, plan);
        }
        maybeLose();
        return reply(plan);
      },
      async swapMealPlanItems(planId, sourceItemId, targetItemId, clientMutationId) {
        calls.push(["swap", sourceItemId, targetItemId]);
        const plan = own(planId);
        if (!swaps.has(clientMutationId)) {
          swaps.add(clientMutationId);
          const source = plan.items.find((item) => item.id === sourceItemId);
          const target = plan.items.find((item) => item.id === targetItemId);
          if (!source || !target) throw Object.assign(new Error("Not found"), { status: 404 });
          [source.day, source.mealSlot, target.day, target.mealSlot] = [target.day, target.mealSlot, source.day, source.mealSlot];
        }
        maybeLose();
        return reply(plan);
      },
      async renameMealPlan(planId, { name }) {
        calls.push(["rename", name]);
        own(planId).name = name;
        return reply(plans.get(planId));
      },
      async deleteMealPlan(planId) {
        calls.push(["delete", planId]);
        if (refuseDelete) throw Object.assign(new Error("Refused"), { status: refuseDelete });
        own(planId);
        plans.delete(planId);
      },
    },
  };
}

let idCounter = 0;
const deps = ({ db, transact }) => ({
  db,
  transact,
  now: () => "2026-10-14T12:00:00.000Z",
  newId: (prefix) => `${prefix}_${++idCounter}`,
  requestSync: () => undefined,
});

let clock = 0;
function replay({ db, transact }, server, online = true) {
  clock += 60 * 60_000;
  return replayOutbox(db, (database, operation) => runPlanCommand(database, operation, { api: server.api, transact }), {
    isOnline: () => online,
    isStopped: () => false,
    now: () => clock,
  });
}

const outbox = (db) => db.getAllAsync("SELECT kind, depends_on, needs_attention FROM sync_queue ORDER BY created_at, rowid");
const mealsByPlace = (plan) =>
  Object.fromEntries(plan.items.map((item) => [`${item.day}:${item.mealSlot}`, item.recipeId]));

test("MP-01: saving a plan keeps it on the phone with its command, before any request", async () => {
  const database = await openTestDatabase();
  const server = fakeServer();
  const plan = await createPlanCommands(deps(database)).savePlan({ draft: DRAFT, name: "Meal plan #1" });

  const [saved] = await getSavedPlans(database.db);
  assert.equal(saved.id, plan.id);
  assert.equal(saved.name, "Meal plan #1");
  assert.equal(saved.items.length, 4);
  assert.deepEqual(await outbox(database.db), [{ kind: "meal_plan_create", depends_on: null, needs_attention: 0 }]);
  assert.deepEqual(server.calls, []);
});

test("MP-01: killed while saving a plan, the phone keeps the plan and its command, or neither", async () => {
  const path = testDatabasePath();
  const crashing = await openTestDatabase(path, { crashAfterWrites: 1 });
  await assert.rejects(createPlanCommands(deps(crashing)).savePlan({ draft: DRAFT, name: "Meal plan #1" }));
  crashing.db.close();

  const restarted = await openTestDatabase(path);
  assert.deepEqual(await getSavedPlans(restarted.db), []);
  assert.deepEqual(await outbox(restarted.db), []);
});

test("MP-01: a plan saved offline reaches the server once, and takes the server's ids", async () => {
  const database = await openTestDatabase();
  const server = fakeServer();
  await createPlanCommands(deps(database)).savePlan({ draft: DRAFT, name: "Meal plan #1" });

  server.loseNextReply();
  await replay(database, server);
  await replay(database, server);

  assert.equal(server.plans.size, 1);
  const [onServer] = server.plans.values();
  assert.equal(onServer.name, "Meal plan #1");
  const [saved] = await getSavedPlans(database.db);
  assert.equal(saved.id, onServer.id);
  assert.ok(saved.items.every((item) => UUID.test(item.id)));
  assert.deepEqual(await outbox(database.db), []);
});

test("MP-01: a saved plan is still known as saved after it's sent, and not after it's deleted", async () => {
  const database = await openTestDatabase();
  const server = fakeServer();
  const commands = createPlanCommands(deps(database));
  const plan = await commands.savePlan({ draft: DRAFT, name: "Meal plan #1" });
  assert.equal(await currentPlanId(database.db, plan.id), plan.id);

  await replay(database, server);
  const [onServer] = server.plans.values();
  assert.equal(await currentPlanId(database.db, plan.id), onServer.id);
  assert.equal(await currentPlanId(database.db, onServer.id), onServer.id);

  await commands.deletePlan({ planId: onServer.id });
  assert.equal(await currentPlanId(database.db, plan.id), null);
  assert.equal(await currentPlanId(database.db, onServer.id), null);
});

test("MP-01: a swap on a plan saved offline shows at once, waits for the save, then swaps on the server", async () => {
  const database = await openTestDatabase();
  const server = fakeServer();
  const commands = createPlanCommands(deps(database));
  const plan = await commands.savePlan({ draft: DRAFT, name: "Meal plan #1" });
  const [pap, jollof] = plan.items;
  await commands.swapMeals({ planId: plan.id, sourceItemId: pap.id, targetItemId: jollof.id });

  const [shown] = await getSavedPlans(database.db);
  assert.equal(mealsByPlace(shown)["1:breakfast"], "jollof");
  assert.equal(mealsByPlace(shown)["1:dinner"], "pap");
  assert.deepEqual((await outbox(database.db)).map((row) => [row.kind, row.depends_on === plan.id]), [
    ["meal_plan_create", false],
    ["meal_plan_swap", true],
  ]);

  await replay(database, server);
  const [onServer] = server.plans.values();
  assert.equal(mealsByPlace(onServer)["1:breakfast"], "jollof");
  assert.equal(mealsByPlace((await getSavedPlans(database.db))[0])["1:breakfast"], "jollof");
  assert.deepEqual(await outbox(database.db), []);
});

test("MP-01: a swap whose reply was lost isn't swapped back", async () => {
  const database = await openTestDatabase();
  const server = fakeServer();
  const commands = createPlanCommands(deps(database));
  const plan = await commands.savePlan({ draft: DRAFT, name: "Meal plan #1" });
  await replay(database, server);
  const [saved] = await getSavedPlans(database.db);
  await commands.swapMeals({ planId: saved.id, sourceItemId: saved.items[0].id, targetItemId: saved.items[1].id });

  server.loseNextReply();
  await replay(database, server);
  await replay(database, server);

  const [onServer] = server.plans.values();
  assert.equal(mealsByPlace(onServer)["1:breakfast"], "jollof");
  assert.notEqual(plan.id, saved.id);
});

test("MP-01: renaming a plan saved offline waits for it, then renames it on the server", async () => {
  const database = await openTestDatabase();
  const server = fakeServer();
  const commands = createPlanCommands(deps(database));
  const plan = await commands.savePlan({ draft: DRAFT, name: "Meal plan #1" });
  await commands.renamePlan({ planId: plan.id, name: "This week" });

  assert.equal((await getSavedPlans(database.db))[0].name, "This week");
  await replay(database, server);
  assert.equal([...server.plans.values()][0].name, "This week");
  assert.deepEqual(await outbox(database.db), []);
});

async function savedOnServer(server) {
  const database = await openTestDatabase();
  await createPlanCommands(deps(database)).savePlan({ draft: DRAFT, name: "Meal plan #1" });
  await replay(database, server);
  const [saved] = await getSavedPlans(database.db);
  return { database, saved };
}

test("MP-01: deleting a plan removes it from the phone at once, then from the server", async () => {
  const server = fakeServer();
  const { database, saved } = await savedOnServer(server);

  await createPlanCommands(deps(database)).deletePlan({ planId: saved.id });
  assert.deepEqual(await getSavedPlans(database.db), []);
  await replay(database, server);
  assert.equal(server.plans.size, 0);
  assert.deepEqual(await outbox(database.db), []);
});

test("MP-01: a plan the server already deleted counts as deleted", async () => {
  const server = fakeServer();
  const { database, saved } = await savedOnServer(server);
  server.plans.clear();

  await createPlanCommands(deps(database)).deletePlan({ planId: saved.id });
  await replay(database, server);
  assert.deepEqual(await outbox(database.db), []);
});

test("MP-01: a delete the server refuses brings the plan back", async () => {
  const server = fakeServer({ refuseDelete: 403 });
  const { database, saved } = await savedOnServer(server);

  await createPlanCommands(deps(database)).deletePlan({ planId: saved.id });
  await replay(database, server);
  assert.deepEqual((await getSavedPlans(database.db)).map((plan) => plan.id), [saved.id]);
  assert.deepEqual(await outbox(database.db), []);
});

test("MP-01: the next suggested name carries on each person's numbering", () => {
  assert.equal(nextPlanName([]), "Meal plan #1");
  assert.equal(nextPlanName(["Meal plan #1", "Meal plan #5", "This week"]), "Meal plan #6");
  assert.equal(nextPlanName(["This week", "Meal plan #2 copy", "meal plan #9"]), "Meal plan #1");
});

test("QAD-01: a plans reply older than plan edits keeps them", async () => {
  const server = fakeServer();
  const { database, saved } = await savedOnServer(server);
  const commands = createPlanCommands(deps(database));
  const fresh = await commands.savePlan({ draft: DRAFT, name: "Meal plan #2" });
  await commands.renamePlan({ planId: saved.id, name: "This week" });

  // Asked for before these edits.
  const reply = [{ ...structuredClone([...server.plans.values()][0]), name: "Meal plan #1" }];
  const shown = await database.transact((tx) => replacePlansKeepingPendingEdits(tx, reply));

  assert.deepEqual(shown.map((plan) => plan.name).sort(), ["Meal plan #2", "This week"]);
  assert.ok((await getSavedPlans(database.db)).some((plan) => plan.id === fresh.id));
});

test("QAD-01: a plans reply keeps a plan being deleted hidden", async () => {
  const server = fakeServer();
  const { database, saved } = await savedOnServer(server);
  await createPlanCommands(deps(database)).deletePlan({ planId: saved.id });

  await database.transact((tx) => replacePlansKeepingPendingEdits(tx, [...server.plans.values()]));
  assert.deepEqual(await getSavedPlans(database.db), []);
});
