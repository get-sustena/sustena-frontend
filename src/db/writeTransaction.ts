import type { SQLiteDatabase } from "expo-sqlite";
import { Platform } from "react-native";

type TransactionTask = (database: SQLiteDatabase) => Promise<void>;

export async function runWriteTransaction(
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
