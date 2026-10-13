import { useKeepAwake } from "expo-keep-awake";

// Keeps the screen on while the calling screen is shown. Web has its own
// version in useScreenAwake.web.ts.
export function useScreenAwake() {
  useKeepAwake("learn-mode");
}
