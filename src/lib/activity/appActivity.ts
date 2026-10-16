import { onlineManager } from "@tanstack/react-query";
import Constants from "expo-constants";
import { randomUUID } from "expo-crypto";
import type { SQLiteDatabase } from "expo-sqlite";
import { Platform } from "react-native";
import { getLocalAccountDataOwner } from "../../db/accountDataRepository";
import { useAuthStore } from "../../store/authStore";
import { trackAccountBackgroundTask } from "../accountBackgroundTasks";
import { reportEvents } from "../api/events";
import { isApiClientError } from "../api/errors";
import { createActivityQueue, type ActivityEvent, type ActivityQueue } from "./activityQueue";

// The app has one database, so one queue (and one "this app open") for it.
const queues = new WeakMap<SQLiteDatabase, ActivityQueue>();

export function activityFor(db: SQLiteDatabase) {
  let queue = queues.get(db);
  if (!queue) {
    queue = createActivityQueue({
      db,
      now: () => new Date(),
      newId: randomUUID,
      currentUserId: () => currentUserId(db),
      canSend: () => onlineManager.isOnline() && !useAuthStore.getState().user?.emailVerificationRequired,
      send: reportEvents,
      isRefused: (error) => isApiClientError(error) && error.status === 422,
    });
    queues.set(db, queue);
  }
  return queue;
}

// Started offline, /auth/me hasn't answered yet, but the signed-in account
// is the one whose data is on the phone.
async function currentUserId(db: SQLiteDatabase) {
  const { user, isAuthenticated, isSigningOut } = useAuthStore.getState();
  if (!isAuthenticated || isSigningOut) return null;
  return user?.id ?? (await getLocalAccountDataOwner(db));
}

// Activity is never worth breaking a screen over: a failed write or send is
// logged, and what's still queued goes with the next send.
function logFailure(task: Promise<unknown>) {
  return task.catch((error) => console.warn("Activity not recorded or sent", error));
}

export function recordActivity(db: SQLiteDatabase, event: ActivityEvent) {
  void logFailure(activityFor(db).record(event));
}

export function recordActivityOncePerOpen(db: SQLiteDatabase, event: ActivityEvent) {
  void logFailure(activityFor(db).recordOncePerOpen(event));
}

// Sign-out waits for a send under way, so it never goes with the next account's session.
export function flushActivity(db: SQLiteDatabase) {
  void trackAccountBackgroundTask(logFailure(activityFor(db).flush()));
}

export function startAppOpen(db: SQLiteDatabase) {
  void trackAccountBackgroundTask(
    logFailure(
      activityFor(db).startOpen({
        platform: Platform.OS === "ios" || Platform.OS === "android" ? Platform.OS : "web",
        appVersion: Constants.expoConfig?.version ?? "unknown",
      })
    )
  );
}
