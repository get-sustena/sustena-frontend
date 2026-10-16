// Activity only the phone sees (app opens, screens, shares, servings), kept
// in SQLite with the time it happened and sent to POST /me/events in
// batches, so it counts offline too. Shared by the app and its tests, so
// nothing here imports React Native.
import type { SQLiteDatabase } from "expo-sqlite";
import {
  deleteActivityEvents,
  deleteActivityEventsBefore,
  insertActivityEvent,
  listActivityEvents,
} from "../../db/activityEventsRepository.ts";

export type ActivityScreen =
  | "home"
  | "pantry"
  | "meal_plans"
  | "shopping_list"
  | "profile"
  | "saved_recipes"
  | "search"
  | "settings";

export type ActivityEvent =
  | { type: "app_opened"; properties: { platform: "web" | "android" | "ios"; appVersion: string } }
  | { type: "screen_viewed"; properties: { screen: ActivityScreen } }
  | { type: "meal_plan_opened"; properties: { mealPlanId: string } }
  | { type: "learn_mode_started"; properties: { recipeId: string } }
  | { type: "nutrition_viewed"; properties: { recipeId: string } }
  | { type: "recipe_opened"; properties: { recipeId: string; source?: string } }
  | { type: "recipe_shared"; properties: { recipeId: string } }
  | { type: "creator_profile_shared"; properties: { creatorProfileId: string } }
  | { type: "shopping_list_shared"; properties: Record<string, never> }
  | { type: "servings_changed"; properties: { recipeId: string; servings: number } };

export type ReportedEvent = {
  clientEventId: string;
  type: string;
  occurredAt: string;
  properties: object;
};

const BATCH_SIZE = 50;
// The server takes 120 batches per person in 10 minutes; this stays under.
const MAX_BATCHES_PER_WINDOW = 100;
const RATE_WINDOW_MS = 10 * 60_000;
// The server reads anything older than a week as "now", so it isn't sent.
const MAX_AGE_MS = 7 * 24 * 60 * 60_000;
// Back after this long away counts as a new app open.
const NEW_OPEN_AFTER_MS = 30 * 60_000;

type Dependencies = {
  db: SQLiteDatabase;
  now: () => Date;
  newId: () => string;
  // Null when signed out or signing out.
  currentUserId: () => Promise<string | null>;
  // Online, and not waiting for the email code (the server refuses everything till then).
  canSend: () => boolean;
  send: (events: ReportedEvent[]) => Promise<unknown>;
  // The server refused the batch as it is (a 422), so sending it again can't help.
  isRefused: (error: unknown) => boolean;
};

export function createActivityQueue({ db, now, newId, currentUserId, canSend, send, isRefused }: Dependencies) {
  const sentAt: number[] = [];
  const seenThisOpen = new Set<string>();
  let backgroundedAt: number | null = null;
  let sending: Promise<void> | null = null;

  async function record(event: ActivityEvent) {
    const userId = await currentUserId();
    if (!userId) return;
    await insertActivityEvent(db, {
      clientEventId: newId(),
      userId,
      type: event.type,
      occurredAt: now().toISOString(),
      properties: event.properties,
    });
  }

  function underRateLimit() {
    const at = now().getTime();
    while (sentAt.length > 0 && at - sentAt[0] >= RATE_WINDOW_MS) sentAt.shift();
    return sentAt.length < MAX_BATCHES_PER_WINDOW;
  }

  async function sendQueued() {
    await deleteActivityEventsBefore(db, new Date(now().getTime() - MAX_AGE_MS).toISOString());
    for (;;) {
      const userId = await currentUserId();
      if (!userId || !canSend() || !underRateLimit()) return;
      const rows = await listActivityEvents(db, userId, BATCH_SIZE);
      if (rows.length === 0) return;

      sentAt.push(now().getTime());
      try {
        // A retry sends the same ids, so the server stores each event once.
        await send(
          rows.map((row) => ({
            clientEventId: row.client_event_id,
            type: row.type,
            occurredAt: row.occurred_at,
            properties: JSON.parse(row.properties_json),
          }))
        );
      } catch (error) {
        if (!isRefused(error)) return;
        // One bad event refuses the whole batch, so it's dropped rather than blocking the queue.
        console.warn("Activity batch refused and dropped", error);
      }
      await deleteActivityEvents(db, rows.map((row) => row.client_event_id));
      if (rows.length < BATCH_SIZE) return;
    }
  }

  function flush() {
    sending ??= sendQueued().finally(() => {
      sending = null;
    });
    return sending;
  }

  // A cold start, a sign-in, or back after 30 minutes away.
  async function startOpen(properties: { platform: "web" | "android" | "ios"; appVersion: string }) {
    seenThisOpen.clear();
    await record({ type: "app_opened", properties });
    await flush();
  }

  return {
    record,
    flush,
    startOpen,
    // Screens and meal plans count once per app open.
    async recordOncePerOpen(event: ActivityEvent) {
      const key = `${event.type}:${JSON.stringify(event.properties)}`;
      if (seenThisOpen.has(key)) return;
      seenThisOpen.add(key);
      await record(event);
    },
    wentToBackground() {
      backgroundedAt ??= now().getTime();
    },
    // Whether coming back starts a new app open.
    cameToForeground() {
      const away = backgroundedAt === null ? 0 : now().getTime() - backgroundedAt;
      backgroundedAt = null;
      return away >= NEW_OPEN_AFTER_MS;
    },
  };
}

export type ActivityQueue = ReturnType<typeof createActivityQueue>;
