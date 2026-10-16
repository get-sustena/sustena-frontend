import Constants from "expo-constants";
import * as Notifications from "expo-notifications";
import type { SQLiteDatabase } from "expo-sqlite";
import { Platform } from "react-native";
import {
  clearStoredMealReminderToken,
  getStoredMealReminderToken,
  saveStoredMealReminderToken,
} from "../../db/appMetadataRepository";
import { theme } from "../../theme/theme";
import { pushTokensApi } from "../api";
import {
  getDeviceTimeZone,
  getMealReminderRecipeId,
  MEAL_REMINDER_CHANNEL_ID,
} from "./mealReminderData";
import { createPhoneRegistration } from "./phoneRegistration";

// Push meal reminders, approved by the founder on 13 October 2026: the backend
// sends "Our Recommendation" at 8am, 1pm and 5pm Lagos time to every phone
// registered here. Web has its own no-op version in mealReminders.web.ts.

type EnableMealRemindersResult = "enabled" | "denied" | "failed";

// Asks permission (the Settings switch is the only place that does), then
// registers this phone with the backend.
export async function enableMealReminders(
  db: SQLiteDatabase
): Promise<EnableMealRemindersResult> {
  await ensureMealReminderChannel();

  const current = await Notifications.getPermissionsAsync();
  const permission =
    current.granted || !current.canAskAgain
      ? current
      : await Notifications.requestPermissionsAsync();
  if (!permission.granted) return "denied";

  return (await phoneRegistration.register(db)) ? "enabled" : "failed";
}

// Called when the app opens with reminders on. It re-registers the phone once
// per app session (Expo tokens can change, and the backend drops dead ones)
// without ever asking for permission. Returns false when the person has since
// turned Sustena's notifications off in the phone's settings.
export async function refreshMealReminders(db: SQLiteDatabase) {
  const permission = await Notifications.getPermissionsAsync();
  if (!permission.granted) return false;

  await ensureMealReminderChannel();
  await phoneRegistration.ensureRegistered(db);
  return true;
}

// Best effort: switching off or signing out must work even offline. A token
// the backend keeps is moved or dropped by its own clean-up.
export async function disableMealReminders(db: SQLiteDatabase) {
  phoneRegistration.forget();
  const token = await getStoredMealReminderToken(db).catch(() => null);
  if (!token) return;

  await pushTokensApi.unregisterPushToken(token).catch(() => undefined);
  await clearStoredMealReminderToken(db).catch(() => undefined);
}

// After Delete account: the server has already removed the phone's token.
export async function forgetMealReminders(db: SQLiteDatabase) {
  phoneRegistration.forget();
  await clearStoredMealReminderToken(db).catch(() => undefined);
}

// Registers the new token when the push service replaces this phone's token.
// The listener also hears the token every time it's fetched; see
// phoneRegistration.ts for why that's ignored.
export function registerNewPushTokens(db: SQLiteDatabase) {
  const subscription = Notifications.addPushTokenListener((deviceToken) => {
    void phoneRegistration.onTokenReported(deviceToken, db);
  });
  return () => subscription.remove();
}

// Calls back with the recipe when someone taps a meal reminder, including the
// tap that opened the app. Each notification is handled once.
export function onMealReminderOpened(open: (recipeId: string) => void) {
  const handle = (response: Notifications.NotificationResponse) => {
    if (response.actionIdentifier !== Notifications.DEFAULT_ACTION_IDENTIFIER) return;

    const notificationId = response.notification.request.identifier;
    if (handledNotificationIds.has(notificationId)) return;
    handledNotificationIds.add(notificationId);

    const recipeId = getMealReminderRecipeId(
      response.notification.request.content.data
    );
    if (recipeId) open(recipeId);
  };

  void Notifications.getLastNotificationResponseAsync().then((response) => {
    if (!response) return;
    handle(response);
    void Notifications.clearLastNotificationResponseAsync();
  });

  const subscription = Notifications.addNotificationResponseReceivedListener(handle);
  return () => subscription.remove();
}

const handledNotificationIds = new Set<string>();

async function ensureMealReminderChannel() {
  if (Platform.OS !== "android") return;

  await Notifications.setNotificationChannelAsync(MEAL_REMINDER_CHANNEL_ID, {
    name: "Meal reminders",
    description: "Breakfast, lunch and dinner ideas at 8am, 1pm and 5pm",
    importance: Notifications.AndroidImportance.HIGH,
    lightColor: theme.colors.navy3,
  });
}

const phoneRegistration = createPhoneRegistration({
  fetchDeviceToken: () => Notifications.getDevicePushTokenAsync(),
  register: registerThisPhone,
});

async function registerThisPhone(
  devicePushToken: Notifications.DevicePushToken,
  db: SQLiteDatabase
) {
  const projectId =
    Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;

  try {
    // Passing the device token stops getExpoPushTokenAsync fetching it again.
    const { data: token } = await Notifications.getExpoPushTokenAsync({
      projectId,
      devicePushToken,
    });
    const previousToken = await getStoredMealReminderToken(db).catch(() => null);

    await pushTokensApi.registerPushToken({
      token,
      platform: Platform.OS === "ios" ? "ios" : "android",
      timeZone: getDeviceTimeZone(),
    });
    await saveStoredMealReminderToken(db, token);

    // A replaced token would otherwise get every reminder twice.
    if (previousToken && previousToken !== token) {
      await pushTokensApi.unregisterPushToken(previousToken).catch(() => undefined);
    }
    return true;
  } catch {
    return false;
  }
}
