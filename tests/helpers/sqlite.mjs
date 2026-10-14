// A real SQLite database for tests, through Node's built-in node:sqlite,
// with the async methods the app uses from expo-sqlite. The app's own
// migrations build the schema, so tests run against the real tables.
import { DatabaseSync } from "node:sqlite";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { migrateDbIfNeeded } from "../../src/db/migrations.ts";

export function testDatabasePath() {
  return join(mkdtempSync(join(tmpdir(), "sustena-test-")), "app.db");
}

// `crashAfterWrites` makes the Nth write inside a transaction throw, as if
// the app were killed right then; the transaction rolls back, as SQLite does
// when a process dies mid-transaction.
export async function openTestDatabase(path = testDatabasePath(), { crashAfterWrites = null } = {}) {
  const sqlite = new DatabaseSync(path);
  let writesInTransaction = null;

  const db = {
    path,
    async execAsync(sql) {
      sqlite.exec(sql);
    },
    async runAsync(sql, params = []) {
      if (writesInTransaction !== null) {
        writesInTransaction += 1;
        if (crashAfterWrites !== null && writesInTransaction > crashAfterWrites) {
          throw new Error("The app was killed");
        }
      }
      const result = sqlite.prepare(sql).run(...params);
      return { changes: Number(result.changes), lastInsertRowId: Number(result.lastInsertRowid) };
    },
    // node:sqlite returns rows without a prototype; expo-sqlite returns
    // plain objects.
    async getAllAsync(sql, params = []) {
      return sqlite.prepare(sql).all(...params).map((row) => ({ ...row }));
    },
    async getFirstAsync(sql, params = []) {
      const row = sqlite.prepare(sql).get(...params);
      return row ? { ...row } : null;
    },
    close() {
      sqlite.close();
    },
  };

  // The same contract as the app's runWriteTransaction.
  const transact = async (work) => {
    sqlite.exec("BEGIN IMMEDIATE");
    writesInTransaction = 0;
    try {
      const result = await work(db);
      sqlite.exec("COMMIT");
      return result;
    } catch (error) {
      sqlite.exec("ROLLBACK");
      throw error;
    } finally {
      writesInTransaction = null;
    }
  };

  await migrateDbIfNeeded(db);
  return { db, transact };
}
