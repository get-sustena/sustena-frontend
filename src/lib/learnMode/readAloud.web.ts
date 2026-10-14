// The web version of readAloud.ts, through the browser's speechSynthesis.
// Browsers without it get no speaker button.

export const canReadAloud = typeof window !== "undefined" && "speechSynthesis" in window;

export function readAloud(text: string, onEnd: () => void) {
  if (!canReadAloud) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = "en-GB";
  utterance.rate = 0.95;
  utterance.onend = onEnd;
  utterance.onerror = onEnd;
  window.speechSynthesis.speak(utterance);
}

export function stopReading() {
  if (canReadAloud) window.speechSynthesis.cancel();
}
