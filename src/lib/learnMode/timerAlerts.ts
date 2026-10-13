import * as Notifications from "expo-notifications";
import { Platform, Vibration } from "react-native";
import { useLearnStore } from "../../store/learnStore";
import { theme } from "../../theme/theme";
import {
  getTimerAlertTarget,
  LEARN_TIMER_CHANNEL_ID,
  timerAlertData,
  type TimerAlertTarget,
} from "./timerAlertData";

// Learn mode timers end with a local notification (PRD v6.8 section 17), so
// it arrives with the app in the background or the phone locked. While the
// recipe's Learn mode is on screen the app shows its own banner instead.
// Web has its own version in timerAlerts.web.ts.

type ScheduledTimerAlert = {
  id: string;
  endsAt: number;
  title: string;
  body: string;
  target: TimerAlertTarget;
};

// Asked the first time someone starts a timer.
export async function allowTimerAlerts() {
  await ensureTimerChannel();
  const current = await Notifications.getPermissionsAsync();
  if (!current.granted && current.canAskAgain) {
    await Notifications.requestPermissionsAsync();
  }
}

// Schedules a notification for each alert and cancels any no longer listed.
// Calls run one after another so a cancel can't overtake a schedule.
export function replaceTimerAlerts(alerts: ScheduledTimerAlert[]) {
  queue = queue.then(() => applyTimerAlerts(alerts)).catch(() => undefined);
}

// Whether a notification that arrives with the app open is a timer whose
// Learn mode is on screen, where the app's own banner shows it.
export function isTimerAlertShownInApp(data: unknown) {
  const target = getTimerAlertTarget(data);
  return target !== null && useLearnStore.getState().onScreenRecipeId === target.recipeId;
}

// Calls back with the step when someone taps a timer notification, including
// the tap that opened the app. Each notification is handled once.
export function onTimerAlertOpened(open: (target: TimerAlertTarget) => void) {
  const handle = (response: Notifications.NotificationResponse) => {
    if (response.actionIdentifier !== Notifications.DEFAULT_ACTION_IDENTIFIER) return;

    const notificationId = response.notification.request.identifier;
    if (handledNotificationIds.has(notificationId)) return;

    const target = getTimerAlertTarget(response.notification.request.content.data);
    if (!target) return;
    handledNotificationIds.add(notificationId);
    open(target);
  };

  void Notifications.getLastNotificationResponseAsync().then((response) => {
    if (response) handle(response);
  });

  const subscription = Notifications.addNotificationResponseReceivedListener(handle);
  return () => subscription.remove();
}

// The buzz with the in-app banner, as the prototype's navigator.vibrate([200, 100, 200]).
// Android reads the pattern as wait, buzz, pause, buzz.
export function buzz() {
  Vibration.vibrate(Platform.OS === "android" ? [0, 200, 100, 200] : 400);
}

let queue: Promise<void> = Promise.resolve();
const scheduled = new Map<string, string>();
const handledNotificationIds = new Set<string>();

async function applyTimerAlerts(alerts: ScheduledTimerAlert[]) {
  const wanted = new Set(alerts.map((alert) => alert.id));
  for (const id of [...scheduled.keys()]) {
    if (wanted.has(id)) continue;
    await Notifications.cancelScheduledNotificationAsync(id);
    scheduled.delete(id);
  }

  for (const alert of alerts) {
    const signature = JSON.stringify([alert.endsAt, alert.title, alert.body, alert.target]);
    if (scheduled.get(alert.id) === signature) continue;

    await Notifications.cancelScheduledNotificationAsync(alert.id);
    await Notifications.scheduleNotificationAsync({
      identifier: alert.id,
      content: {
        title: alert.title,
        body: alert.body,
        data: timerAlertData(alert.target),
        sound: "default",
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: alert.endsAt,
        channelId: LEARN_TIMER_CHANNEL_ID,
      },
    });
    scheduled.set(alert.id, signature);
  }
}

async function ensureTimerChannel() {
  if (Platform.OS !== "android") return;

  await Notifications.setNotificationChannelAsync(LEARN_TIMER_CHANNEL_ID, {
    name: "Cooking timers",
    description: "When a Learn mode timer ends",
    importance: Notifications.AndroidImportance.HIGH,
    lightColor: theme.colors.navy3,
  });
}
