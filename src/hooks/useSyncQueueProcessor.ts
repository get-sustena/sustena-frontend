
import NetInfo from "@react-native-community/netinfo";
import { useSQLiteContext } from "expo-sqlite";
import { useEffect, useRef } from "react";
import { AppState } from "react-native";
import { processSyncQueue } from "../lib/sync/processSyncQueue";
import { trackAccountBackgroundTask } from "../lib/accountBackgroundTasks";
import { isConnectedState } from "../lib/query/networkStatus";
import { useAuthStore } from "../store/authStore";

export function useSyncQueueProcessor(enabled = true) {
  const db = useSQLiteContext();
  const isRunningRef = useRef(false);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    function runProcessor(reconnected = false) {
      if (isRunningRef.current || useAuthStore.getState().isSigningOut) {
        return;
      }

      isRunningRef.current = true;

      trackAccountBackgroundTask(processSyncQueue(db, { reconnected }))
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
        runProcessor(true);
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
  }, [db, enabled]);
}
