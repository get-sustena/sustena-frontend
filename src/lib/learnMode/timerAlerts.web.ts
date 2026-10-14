import { useLearnStore } from "../../store/learnStore";
import {
  getTimerAlertTarget,
  learnModeHref,
  timerAlertData,
  type TimerAlertTarget,
} from "./timerAlertData";

// The web version of timerAlerts.ts. Browsers can't schedule a notification,
// so each timer has a page timeout, and the notification is shown through the
// service worker: Chrome on Android only shows page notifications that way.
// It shows while the tab is in the background; a closed tab has no timers.

type ScheduledTimerAlert = {
  id: string;
  endsAt: number;
  title: string;
  body: string;
  target: TimerAlertTarget;
};

// Only shows notifications and opens the app when one is tapped.
const SERVICE_WORKER_URL = "/learn-timer-sw.js";

export async function allowTimerAlerts() {
  if (!canNotify()) return;
  if (Notification.permission === "default") {
    await Notification.requestPermission();
  }
  if (Notification.permission === "granted") {
    await navigator.serviceWorker.register(SERVICE_WORKER_URL);
  }
}

export function replaceTimerAlerts(alerts: ScheduledTimerAlert[]) {
  const wanted = new Set(alerts.map((alert) => alert.id));
  for (const [id, pending] of timeouts) {
    if (wanted.has(id)) continue;
    clearTimeout(pending.timeout);
    timeouts.delete(id);
  }

  for (const alert of alerts) {
    const signature = JSON.stringify([alert.endsAt, alert.title, alert.body, alert.target]);
    const pending = timeouts.get(alert.id);
    if (pending?.signature === signature) continue;
    if (pending) clearTimeout(pending.timeout);

    const timeout = setTimeout(() => {
      timeouts.delete(alert.id);
      void showAlert(alert);
    }, Math.max(0, alert.endsAt - Date.now()));
    timeouts.set(alert.id, { signature, timeout });
  }
}

export function onTimerAlertOpened(open: (target: TimerAlertTarget) => void) {
  if (!canNotify()) return () => {};

  const handle = (event: MessageEvent) => {
    const { type, target } = (event.data ?? {}) as { type?: unknown; target?: unknown };
    if (type !== "learn-timer-opened") return;
    const opened = getTimerAlertTarget(target);
    if (opened) open(opened);
  };
  navigator.serviceWorker.addEventListener("message", handle);
  return () => navigator.serviceWorker.removeEventListener("message", handle);
}

export function buzz() {
  if ("vibrate" in navigator) navigator.vibrate([200, 100, 200]);
}

const timeouts = new Map<string, { signature: string; timeout: ReturnType<typeof setTimeout> }>();

function canNotify() {
  return typeof window !== "undefined" && "Notification" in window && "serviceWorker" in navigator;
}

async function showAlert(alert: ScheduledTimerAlert) {
  const onScreen = useLearnStore.getState().onScreenRecipeId === alert.target.recipeId;
  if (onScreen && document.visibilityState === "visible") return;
  if (!canNotify() || Notification.permission !== "granted") return;

  const registration = await navigator.serviceWorker.getRegistration(SERVICE_WORKER_URL);
  await registration?.showNotification(alert.title, {
    body: alert.body,
    tag: alert.id,
    icon: "/favicon.ico",
    data: { ...timerAlertData(alert.target), url: learnModeHref(alert.target) },
  });
}
