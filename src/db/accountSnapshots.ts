// Each account's own data, kept aside while another account uses the phone
// and put back when it returns. Whole rows are kept, and a row goes back
// with the columns its table has now, so a column added later never drops
// out of a snapshot, and an older snapshot gets that column's default.
// Shared by the app and its tests, so nothing here imports React Native.
import type { SQLiteDatabase } from "expo-sqlite";

type Value = string | number | null;
type Row = Record<string, Value>;
export type AccountSnapshot = Record<string, Row[]>;

const ACCOUNT_TABLES = [
  "pantry_items",
  "shopping_list_items",
  "shopping_lists",
  "favorite_recipes",
  "user_preferences",
  "local_profile_answers",
  "local_planner_settings",
  "creator_recipe_drafts",
  "sync_queue",
  "sync_id_mappings",
  "meal_plans",
] as const;

export async function captureAccountTables(tx: SQLiteDatabase) {
  const snapshot: AccountSnapshot = {};
  for (const table of ACCOUNT_TABLES) {
    snapshot[table] = await tx.getAllAsync<Row>(`SELECT * FROM ${table}`);
  }
  return snapshot;
}

export async function clearAccountTables(tx: SQLiteDatabase) {
  for (const table of ACCOUNT_TABLES) await tx.runAsync(`DELETE FROM ${table}`);
}

// Values a snapshot from before a column existed can't have, worked out
// the way the app did when it added the column.
function filledIn(table: string, row: Row): Row {
  if (table === "shopping_list_items" && row.price_status === undefined) {
    return { ...row, price_status: row.estimated_price == null ? "unknown" : "estimated" };
  }
  return row;
}

export async function restoreAccountTables(tx: SQLiteDatabase, snapshot: AccountSnapshot) {
  for (const table of ACCOUNT_TABLES) {
    const columns = new Set(
      (await tx.getAllAsync<{ name: string }>(`PRAGMA table_info(${table})`)).map((column) => column.name)
    );
    for (const stored of snapshot[table] ?? []) {
      const row = filledIn(table, stored);
      const names = Object.keys(row).filter((name) => columns.has(name) && row[name] !== undefined);
      await tx.runAsync(
        `INSERT INTO ${table} (${names.join(", ")}) VALUES (${names.map(() => "?").join(", ")})`,
        names.map((name) => row[name])
      );
    }
  }
}
