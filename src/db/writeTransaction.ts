import type { SQLiteDatabase } from "expo-sqlite";
import { Platform } from "react-native";
import { enqueueWrite } from "./writeQueue";

type TransactionTask<T> = (database: SQLiteDatabase) => Promise<T>;

async function executeWriteTransaction<T>(
  database: SQLiteDatabase,
  task: TransactionTask<T>
) {
  let result!: T;

  if (Platform.OS === "web") {
    await database.withTransactionAsync(async () => {
      result = await task(database);
    });
    return result;
  }

  await database.withExclusiveTransactionAsync(async (transaction) => {
    result = await task(transaction as unknown as SQLiteDatabase);
  });
  return result;
}

export function runWriteTransaction<T>(
  database: SQLiteDatabase,
  task: TransactionTask<T>
) {
  return enqueueWrite(database, () => executeWriteTransaction(database, task));
}
