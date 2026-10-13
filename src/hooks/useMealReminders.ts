import { useSQLiteContext } from "expo-sqlite";
import { useEffect } from "react";
import { openRecipe } from "../lib/navigation/openRecipe";
import {
  disableMealReminders,
  onMealReminderOpened,
  refreshMealReminders,
  registerNewPushTokens,
} from "../lib/notifications/mealReminders";
import { useAuthStore } from "../store/authStore";
import { usePreferencesStore } from "../store/preferencesStore";

// Keeps this phone registered for meal reminders while someone is signed in
// with the Settings switch on, and opens the recipe when a reminder is tapped.
export function useMealReminders() {
  const db = useSQLiteContext();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const enabled = usePreferencesStore((state) => state.mealRemindersEnabled);
  const setEnabled = usePreferencesStore((state) => state.setMealRemindersEnabled);

  useEffect(() => {
    if (!isAuthenticated || !enabled) return;

    let active = true;
    void refreshMealReminders(db).then((stillAllowed) => {
      // Notifications were turned off in the phone's settings, so the
      // switch shouldn't keep claiming reminders are on.
      if (active && !stillAllowed) {
        setEnabled(false);
        void disableMealReminders(db);
      }
    });

    const stopListening = registerNewPushTokens(db);
    return () => {
      active = false;
      stopListening();
    };
  }, [db, enabled, isAuthenticated, setEnabled]);

  useEffect(
    () =>
      onMealReminderOpened((recipeId) => openRecipe(recipeId, "meal_reminder")),
    []
  );
}
