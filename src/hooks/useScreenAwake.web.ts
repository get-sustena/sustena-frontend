import { useEffect } from "react";

// The web version of useScreenAwake.ts, through the Screen Wake Lock API.
// The browser lets go of the lock when the tab is hidden, so it's asked for
// again each time the tab comes back (as MDN's Screen Wake Lock guide shows).
export function useScreenAwake() {
  useEffect(() => {
    if (!("wakeLock" in navigator)) return;

    let active = true;
    let lock: WakeLockSentinel | null = null;

    const request = () => {
      if (document.visibilityState !== "visible") return;
      navigator.wakeLock
        .request("screen")
        .then((sentinel) => {
          if (active) lock = sentinel;
          else void sentinel.release();
        })
        .catch(() => undefined);
    };

    request();
    document.addEventListener("visibilitychange", request);
    return () => {
      active = false;
      document.removeEventListener("visibilitychange", request);
      void lock?.release();
    };
  }, []);
}
