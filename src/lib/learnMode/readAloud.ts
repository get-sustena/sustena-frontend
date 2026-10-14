import * as Speech from "expo-speech";

// Learn mode's speaker button reads a step with the phone's own voice, as the
// v6.8 prototype does. Web has its own version in readAloud.web.ts.

export const canReadAloud = true;

export function readAloud(text: string, onEnd: () => void) {
  Speech.stop();
  Speech.speak(text, {
    language: "en-GB",
    rate: 0.95,
    onDone: onEnd,
    onStopped: onEnd,
    onError: onEnd,
  });
}

export function stopReading() {
  Speech.stop();
}
