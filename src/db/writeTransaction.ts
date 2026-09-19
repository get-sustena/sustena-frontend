import type { SQLiteDatabase } from "expo-sqlite";
import { Platform } from "react-native";
import { enqueueWrite } from "./writeQueue";

type TransactionTask = (database: SQLiteDatabase) => Promise<void>;

async function executeWriteTransaction(
  database: SQLiteDatabase,
  task: TransactionTask
) {
  if (Platform.OS === "web") {
    await database.withTransactionAsync(() => task(database));
    return;
  }

  await database.withExclusiveTransactionAsync(async (transaction) => {
    await task(transaction as unknown as SQLiteDatabase);
  });
}

export function runWriteTransaction(
  database: SQLiteDatabase,
  task: TransactionTask
) {
  return enqueueWrite(database, () => executeWriteTransaction(database, task));
}
