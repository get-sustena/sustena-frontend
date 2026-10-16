import { useFocusEffect } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { useCallback, useEffect, useRef } from "react";
import { AppState } from "react-native";
import type { ActivityEvent, ActivityScreen } from "../lib/activity/activityQueue";
import { activityFor, flushActivity, recordActivity, recordActivityOncePerOpen, startAppOpen } from "../lib/activity/appActivity";
import { useAuthStore } from "../store/authStore";
import { useDebouncedValue } from "./useDebouncedValue";

const SEND_EVERY_MS = 30_000;

export function useRecordActivity() {
  const db = useSQLiteContext();
  return useCallback((event: ActivityEvent) => recordActivity(db, event), [db]);
}

// Once per screen per app open.
export function useScreenViewed(screen: ActivityScreen) {
  const db = useSQLiteContext();
  useFocusEffect(
    useCallback(() => {
      recordActivityOncePerOpen(db, { type: "screen_viewed", properties: { screen } });
    }, [db, screen])
  );
}

const SERVER_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// A plan saved offline has a temporary id until it's sent; the screen then
// switches to the server's id, and that's the one counted.
export function useMealPlanOpened(mealPlanId: string | undefined) {
  const db = useSQLiteContext();
  useEffect(() => {
    if (mealPlanId && SERVER_ID.test(mealPlanId)) recordActivityOncePerOpen(db, { type: "meal_plan_opened", properties: { mealPlanId } });
  }, [db, mealPlanId]);
}

export function useNutritionViewed(recipeId: string | undefined) {
  const db = useSQLiteContext();
  useEffect(() => {
    if (recipeId) recordActivity(db, { type: "nutrition_viewed", properties: { recipeId } });
  }, [db, recipeId]);
}

// The stepper changes a step at a time, so only where it stops counts.
const SERVINGS_SETTLE_MS = 1_000;

export function useServingsChanged(recipeId: string | undefined, servings: number) {
  const db = useSQLiteContext();
  const settled = useDebouncedValue(servings, SERVINGS_SETTLE_MS);
  const lastCounted = useRef(settled);
  useEffect(() => {
    if (!recipeId || settled === lastCounted.current) return;
    lastCounted.current = settled;
    recordActivity(db, { type: "servings_changed", properties: { recipeId, servings: settled } });
  }, [db, recipeId, settled]);
}

// The server counts a recipe opened when GET /recipes/{id} answers. When the
// page showed the phone's saved copy because the server's didn't come
// (offline, or it failed), and it never came during the visit, the phone
// counts it instead: on leaving the page, or on going to the background (the
// app may be closed from there). A request still on its way isn't counted
// here, so an open is never counted twice.
export function useOfflineRecipeOpened(
  recipeId: string | undefined,
  source: string | undefined,
  { savedCopyWithoutServer, serverAnsweredAt }: { savedCopyWithoutServer: boolean; serverAnsweredAt: number }
) {
  const db = useSQLiteContext();
  const visit = useRef({ startedAt: 0, savedCopyWithoutServer: false, serverAnswered: false });

  // Effects run in order, so the visit's start is set before the first check below.
  useEffect(() => {
    visit.current.startedAt = Date.now();
  }, []);

  useEffect(() => {
    if (savedCopyWithoutServer) visit.current.savedCopyWithoutServer = true;
    if (serverAnsweredAt >= visit.current.startedAt) visit.current.serverAnswered = true;
  }, [savedCopyWithoutServer, serverAnsweredAt]);

  useEffect(() => {
    if (!recipeId) return;
    let counted = false;
    const countIfOffline = () => {
      const { savedCopyWithoutServer: offline, serverAnswered } = visit.current;
      if (counted || !offline || serverAnswered) return;
      counted = true;
      recordActivity(db, { type: "recipe_opened", properties: { recipeId, ...(source ? { source } : {}) } });
    };
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "background") countIfOffline();
    });
    return () => {
      subscription.remove();
      countIfOffline();
    };
  }, [db, recipeId, source]);
}

// App opens (a cold start with a saved session, or back after 30 minutes
// away), and sending what's queued: on open, on leaving and coming back, and
// every 30 seconds. A sign-in starts its own open (useAuth.ts).
export function useActivityTracker(ready: boolean) {
  const db = useSQLiteContext();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const coldStartHandled = useRef(false);

  useEffect(() => {
    if (!ready || coldStartHandled.current) return;
    coldStartHandled.current = true;
    if (isAuthenticated) startAppOpen(db);
  }, [db, isAuthenticated, ready]);

  useEffect(() => {
    if (!isAuthenticated) return;
    const activity = activityFor(db);
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") {
        if (activity.cameToForeground()) startAppOpen(db);
        else flushActivity(db);
      } else if (state === "background") {
        activity.wentToBackground();
        flushActivity(db);
      }
    });
    const timer = setInterval(() => flushActivity(db), SEND_EVERY_MS);
    return () => {
      subscription.remove();
      clearInterval(timer);
    };
  }, [db, isAuthenticated]);
}
