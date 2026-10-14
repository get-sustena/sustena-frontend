import type { SQLiteDatabase } from "expo-sqlite";
import { DEFAULT_SHOPPING_LIST_ID } from "../types/shoppingList";
import { runWithSqliteRetry } from "./sqliteGuards";
import { runWriteTransaction } from "./writeTransaction";
import {
  captureAccountTables,
  clearAccountTables,
  restoreAccountTables,
  type AccountSnapshot,
} from "./accountSnapshots";

const ACCOUNT_DATA_OWNER_KEY = "account_data_owner_user_id";


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
        const snapshot = await captureAccountTables(transactionDb);
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

      await clearAccountTables(transactionDb);

      const restored = nextOwnerUserId
        ? await restoreSavedAccount(transactionDb, nextOwnerUserId)
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

async function restoreSavedAccount(db: SQLiteDatabase, userId: string) {
  const stored = await db.getFirstAsync<{ snapshot_json: string }>(
    "SELECT snapshot_json FROM account_data_snapshots WHERE user_id = ?",
    [userId]
  );
  if (!stored) {
    return false;
  }

  let snapshot: AccountSnapshot;
  try {
    snapshot = JSON.parse(stored.snapshot_json) as AccountSnapshot;
  } catch {
    return false;
  }
  await restoreAccountTables(db, snapshot);
  return true;
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
