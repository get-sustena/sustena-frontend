import * as Notifications from "expo-notifications";
import { isTimerAlertShownInApp } from "../learnMode/timerAlerts";

// Notifications that arrive while the app is open show as they would with it
// closed; without a handler they're dropped. The one exception is a Learn mode
// timer whose recipe is on screen: the app shows its own banner for it.
// Web has its own no-op version in foregroundNotifications.web.ts.
export function configureForegroundNotifications() {
  Notifications.setNotificationHandler({
    handleNotification: async (notification) => {
      const shownInApp = isTimerAlertShownInApp(notification.request.content.data);
      return {
        shouldShowBanner: !shownInApp,
        shouldShowList: !shownInApp,
        shouldPlaySound: !shownInApp,
        shouldSetBadge: false,
      };
    },
  });
}
