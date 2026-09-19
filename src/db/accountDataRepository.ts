import type { SQLiteDatabase } from "expo-sqlite";
import { DEFAULT_SHOPPING_LIST_ID } from "../types/shoppingList";
import { runWithSqliteRetry } from "./sqliteGuards";
import { runWriteTransaction } from "./writeTransaction";

const ACCOUNT_DATA_OWNER_KEY = "account_data_owner_user_id";
const ACCOUNT_DATA_TABLES = [
  {
    name: "pantry_items",
    columns: ["ingredient_id", "created_at", "updated_at"],
  },
  {
    name: "shopping_list_items",
    columns: [
      "id",
      "ingredient_id",
      "name",
      "emoji",
      "quantity",
      "amount",
      "display_quantity",
      "unit",
      "category",
      "estimated_price",
      "price_status",
      "client_mutation_id",
      "checked",
      "source_recipe_id",
      "created_at",
      "updated_at",
      "list_id",
    ],
  },
  {
    name: "shopping_lists",
    columns: [
      "id",
      "name",
      "is_default_synced_list",
      "created_at",
      "updated_at",
    ],
  },
  {
    name: "favorite_recipes",
    columns: ["recipe_id", "created_at", "updated_at"],
  },
  {
    name: "user_preferences",
    columns: [
      "id",
      "health_conditions_json",
      "dietary_preference",
      "default_unit_mode",
      "default_serving_size",
      "haptics_enabled",
      "data_saver_enabled",
      "meal_reminders_enabled",
      "has_completed_onboarding",
      "created_at",
      "updated_at",
    ],
  },
  {
    name: "local_profile_answers",
    columns: [
      "id",
      "nickname",
      "gender",
      "birthday_month",
      "birthday_day",
      "lifestyle",
      "remote_flex",
      "experience",
      "goals_json",
      "challenges_json",
      "habit_who",
      "habit_freq",
      "habit_time",
      "heard",
      "heard_other",
      "updated_at",
    ],
  },
  {
    name: "local_planner_settings",
    columns: [
      "id",
      "days",
      "meal_slots_json",
      "meals_per_day",
      "updated_at",
    ],
  },
  {
    name: "creator_recipe_drafts",
    columns: [
      "id",
      "revision",
      "payload_json",
      "sync_status",
      "last_error",
      "updated_at",
    ],
  },
  {
    name: "sync_queue",
    columns: [
      "id",
      "kind",
      "payload_json",
      "created_at",
      "attempts",
    ],
  },
  {
    name: "sync_id_mappings",
    columns: ["temporary_id", "server_id", "entity_kind", "created_at"],
  },
] as const;

type AccountDataValue = string | number | null;
type AccountDataRow = Record<string, AccountDataValue>;
type AccountDataSnapshot = Record<string, AccountDataRow[]>;

export async function getLocalAccountDataOwner(db: SQLiteDatabase) {
  const currentOwner = await db.getFirstAsync<{ value: string }>(
    "SELECT value FROM local_metadata WHERE key = ?",
    [ACCOUNT_DATA_OWNER_KEY]
  );

  return currentOwner?.value ?? null;
}

export async function prepareLocalAccountData(
  db: SQLiteDatabase,
  userId: string
) {
  const currentOwner = await getLocalAccountDataOwner(db);

  if (currentOwner === userId) {
    return false;
  }

  await replaceLocalAccountData(db, userId);
  return true;
}

export async function clearLocalAccountData(db: SQLiteDatabase) {
  await replaceLocalAccountData(db, null);
}

async function replaceLocalAccountData(
  db: SQLiteDatabase,
  nextOwnerUserId: string | null
) {
  await runWithSqliteRetry(async () => {
    await runWriteTransaction(db, async (transactionDb) => {
      const now = new Date().toISOString();
      const currentOwner = await transactionDb.getFirstAsync<{
        value: string;
      }>(
        "SELECT value FROM local_metadata WHERE key = ?",
        [ACCOUNT_DATA_OWNER_KEY]
      );

      if (currentOwner?.value) {
        const snapshot = await captureAccountData(transactionDb);
        await transactionDb.runAsync(
          `
          INSERT INTO account_data_snapshots (user_id, snapshot_json, updated_at)
          VALUES (?, ?, ?)
          ON CONFLICT(user_id) DO UPDATE SET
            snapshot_json = excluded.snapshot_json,
            updated_at = excluded.updated_at
          `,
          [currentOwner.value, JSON.stringify(snapshot), now]
        );
      }

      await clearActiveAccountTables(transactionDb);

      const restored = nextOwnerUserId
        ? await restoreAccountData(transactionDb, nextOwnerUserId)
        : false;
      const restoredListCount = restored
        ? ((await transactionDb.getFirstAsync<{ count: number }>(
            "SELECT COUNT(*) AS count FROM shopping_lists"
          ))?.count ?? 0)
        : 0;
      if (!restored || restoredListCount === 0) {
        await insertDefaultShoppingList(transactionDb, now);
      }

      if (nextOwnerUserId) {
        await transactionDb.runAsync(
          `
          INSERT INTO local_metadata (key, value, updated_at)
          VALUES (?, ?, ?)
          ON CONFLICT(key) DO UPDATE SET
            value = excluded.value,
            updated_at = excluded.updated_at
          `,
          [ACCOUNT_DATA_OWNER_KEY, nextOwnerUserId, now]
        );
      } else {
        await transactionDb.runAsync(
          "DELETE FROM local_metadata WHERE key = ?",
          [ACCOUNT_DATA_OWNER_KEY]
        );
      }
    });
  });
}

async function captureAccountData(db: SQLiteDatabase) {
  const snapshot: AccountDataSnapshot = {};

  for (const table of ACCOUNT_DATA_TABLES) {
    snapshot[table.name] = await db.getAllAsync<AccountDataRow>(
      `SELECT ${table.columns.join(", ")} FROM ${table.name}`
    );
  }

  return snapshot;
}

async function restoreAccountData(db: SQLiteDatabase, userId: string) {
  const stored = await db.getFirstAsync<{ snapshot_json: string }>(
    "SELECT snapshot_json FROM account_data_snapshots WHERE user_id = ?",
    [userId]
  );
  if (!stored) {
    return false;
  }

  let snapshot: AccountDataSnapshot;
  try {
    snapshot = JSON.parse(stored.snapshot_json) as AccountDataSnapshot;
  } catch {
    return false;
  }
  for (const table of ACCOUNT_DATA_TABLES) {
    for (const row of snapshot[table.name] ?? []) {
      const placeholders = table.columns.map(() => "?").join(", ");
      await db.runAsync(
        `INSERT INTO ${table.name} (${table.columns.join(", ")}) VALUES (${placeholders})`,
        table.columns.map((column) => snapshotValue(table.name, column, row))
      );
    }
  }

  return true;
}

function snapshotValue(
  tableName: (typeof ACCOUNT_DATA_TABLES)[number]["name"],
  column: string,
  row: AccountDataRow
): AccountDataValue {
  const value = row[column];
  if (value !== undefined) {
    return value;
  }

  if (tableName === "shopping_list_items" && column === "price_status") {
    return row.estimated_price == null ? "unknown" : "estimated";
  }

  return null;
}

async function clearActiveAccountTables(db: SQLiteDatabase) {
  for (const table of ACCOUNT_DATA_TABLES) {
    await db.runAsync(`DELETE FROM ${table.name}`);
  }
}

async function insertDefaultShoppingList(db: SQLiteDatabase, now: string) {
  await db.runAsync(
    `
    INSERT INTO shopping_lists (
      id,
      name,
      is_default_synced_list,
      created_at,
      updated_at
    ) VALUES (?, ?, 1, ?, ?)
    `,
    [DEFAULT_SHOPPING_LIST_ID, "My Shopping List", now, now]
  );
}
