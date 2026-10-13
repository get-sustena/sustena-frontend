import { useEffect, useState } from "react";
import { AppState } from "react-native";
import { getMealTime } from "../lib/mealTime";

// The current meal time, rechecked every minute while the app is open and
// whenever it comes back to the foreground, so 11:00 and 16:00 switch the
// recommendations without a restart.
export function useMealTime() {
  const [mealTime, setMealTime] = useState(() => getMealTime(new Date()));

  useEffect(() => {
    const refresh = () => setMealTime(getMealTime(new Date()));
    const interval = setInterval(refresh, 60_000);
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") refresh();
    });

    return () => {
      clearInterval(interval);
      subscription.remove();
    };
  }, []);

  return mealTime;
}
