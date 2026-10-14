
import NetInfo from "@react-native-community/netinfo";
import { useSQLiteContext } from "expo-sqlite";
import { useEffect, useRef } from "react";
import { AppState } from "react-native";
import { processSyncQueue } from "../lib/sync/processSyncQueue";
import { notifySyncFinished, onSyncRequested } from "../lib/sync/syncEvents";
import { trackAccountBackgroundTask } from "../lib/accountBackgroundTasks";
import { isConnectedState } from "../lib/query/networkStatus";
import { useAuthStore } from "../store/authStore";

export function useSyncQueueProcessor(enabled = true) {
  const db = useSQLiteContext();
  const isRunningRef = useRef(false);
  // A request during a run (an edit queued too late for it, or a
  // reconnect) runs the queue again afterwards; true keeps the reconnect.
  const runAgainRef = useRef<boolean | null>(null);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    function runProcessor(reconnected = false) {
      if (useAuthStore.getState().isSigningOut) {
        return;
      }
      if (isRunningRef.current) {
        runAgainRef.current = Boolean(runAgainRef.current) || reconnected;
        return;
      }

      isRunningRef.current = true;
      runAgainRef.current = null;

      trackAccountBackgroundTask(processSyncQueue(db, { reconnected }))
        .catch((error) => {
          console.error("Failed to process sync queue", error);
        })
        .finally(() => {
          isRunningRef.current = false;
          notifySyncFinished();
          if (runAgainRef.current !== null) {
            runProcessor(runAgainRef.current);
          }
        });
    }

    runProcessor();

    const unsubscribeRequests = onSyncRequested(() => runProcessor());

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
      unsubscribeRequests();
      unsubscribeNetwork();
      appStateSubscription.remove();
    };
  }, [db, enabled]);
}
