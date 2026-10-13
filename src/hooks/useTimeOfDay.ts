import { useEffect, useState } from "react";
import { AppState } from "react-native";

// Reads a value from the clock, such as the meal time or the greeting, and
// reads it again every minute while the app is open and whenever it comes
// back to the foreground. The screen re-renders only when the value changes.
// Pass a function defined outside the component so it stays the same.
export function useTimeOfDay<T>(read: (date: Date) => T) {
  const [value, setValue] = useState(() => read(new Date()));

  useEffect(() => {
    const refresh = () => setValue(read(new Date()));
    const interval = setInterval(refresh, 60_000);
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") refresh();
    });

    return () => {
      clearInterval(interval);
      subscription.remove();
    };
  }, [read]);

  return value;
}
