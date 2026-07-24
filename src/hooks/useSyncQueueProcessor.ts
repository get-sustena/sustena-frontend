// src/hooks/useSyncQueueProcessor.ts

import NetInfo from "@react-native-community/netinfo";
import { useSQLiteContext } from "expo-sqlite";
import { useEffect, useRef } from "react";
import { AppState } from "react-native";
import { processSyncQueue } from "../lib/sync/processSyncQueue";
import { isConnectedState } from "../lib/query/networkStatus";

export function useSyncQueueProcessor() {
  const db = useSQLiteContext();
  const isRunningRef = useRef(false);

  useEffect(() => {
    function runProcessor() {
      if (isRunningRef.current) {
        return;
      }

      isRunningRef.current = true;

      processSyncQueue(db)
        .catch((error) => {
          console.error("Failed to process sync queue", error);
        })
        .finally(() => {
          isRunningRef.current = false;
        });
    }

    runProcessor();

    const unsubscribeNetwork = NetInfo.addEventListener((state) => {
      if (isConnectedState(state)) {
        runProcessor();
      }
    });

    const appStateSubscription = AppState.addEventListener(
      "change",
      (nextState) => {
        if (nextState === "active") {
          runProcessor();
        }
      }
    );

    return () => {
      unsubscribeNetwork();
      appStateSubscription.remove();
    };
  }, [db]);
}
