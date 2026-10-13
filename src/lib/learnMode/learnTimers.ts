// Shared by the app and its tests, so nothing here imports React Native.
import type { LearnStep } from "./learnSteps";

export type LearnTimerStatus = "running" | "paused" | "done";

// A started timer. While running it counts to endsAt; while paused it holds
// leftSeconds. A range counts down its shorter time (PRD v6.8 section 17).
export type StartedTimer = {
  step: number;
  timer: number;
  totalSeconds: number;
  status: LearnTimerStatus;
  endsAt: number;
  leftSeconds: number;
};

export type StartedTimers = Record<string, StartedTimer>;

export function timerKey(step: number, timer: number) {
  return `${step}-${timer}`;
}

export function startTimer(step: number, timer: number, totalSeconds: number, now: number): StartedTimer {
  return { step, timer, totalSeconds, status: "running", endsAt: now + totalSeconds * 1000, leftSeconds: totalSeconds };
}

export function pauseTimer(started: StartedTimer, now: number): StartedTimer {
  if (started.status !== "running") return started;
  return { ...started, status: "paused", leftSeconds: secondsLeft(started, now) };
}

export function resumeTimer(started: StartedTimer, now: number): StartedTimer {
  if (started.status !== "paused") return started;
  return { ...started, status: "running", endsAt: now + started.leftSeconds * 1000 };
}

export function secondsLeft(started: StartedTimer, now: number) {
  if (started.status === "done") return 0;
  if (started.status === "paused") return started.leftSeconds;
  return Math.max(0, (started.endsAt - now) / 1000);
}

// Marks running timers whose time is up as done, and returns them.
export function settleTimers(timers: StartedTimers, now: number) {
  const finished: StartedTimer[] = [];
  const next: StartedTimers = {};
  for (const [key, started] of Object.entries(timers)) {
    if (started.status === "running" && started.endsAt <= now) {
      const done = { ...started, status: "done" as const, leftSeconds: 0 };
      next[key] = done;
      finished.push(done);
    } else {
      next[key] = started;
    }
  }
  return { timers: next, finished };
}

// The running timer that ends soonest, for the chip shown on other steps.
export function nearestRunningTimer(timers: StartedTimers, now: number, exceptStep: number) {
  return Object.values(timers)
    .filter((started) => started.status === "running" && started.step !== exceptStep)
    .sort((left, right) => secondsLeft(left, now) - secondsLeft(right, now))[0] ?? null;
}

// "12:03", or "1:05:00" from an hour up.
export function formatClock(seconds: number) {
  const whole = Math.max(0, Math.ceil(seconds));
  const hours = Math.floor(whole / 3600);
  const minutes = Math.floor((whole % 3600) / 60);
  const rest = String(whole % 60).padStart(2, "0");
  return hours ? `${hours}:${String(minutes).padStart(2, "0")}:${rest}` : `${minutes}:${rest}`;
}

// Timers are shown in minutes, or in seconds when the longest is under one.
function lengthUnit(longestSeconds: number) {
  return longestSeconds < 60 ? "sec" : "min";
}

function inUnit(seconds: number, unit: "sec" | "min") {
  return unit === "sec" ? seconds : Math.round(seconds / 60);
}

// "15–20 min", "2 min" or "30 sec".
export function formatTimerLength(minSeconds: number, maxSeconds: number | null) {
  const unit = lengthUnit(maxSeconds ?? minSeconds);
  return maxSeconds
    ? `${inUnit(minSeconds, unit)}–${inUnit(maxSeconds, unit)} ${unit}`
    : `${inUnit(minSeconds, unit)} ${unit}`;
}

// Under a running range: "Check after 15 min. It can take up to 20."
export function rangeNote(minSeconds: number, maxSeconds: number) {
  const unit = lengthUnit(maxSeconds);
  return `Check after ${inUnit(minSeconds, unit)} ${unit}. It can take up to ${inUnit(maxSeconds, unit)}.`;
}

// Whether every timer in the step has run to the end.
export function stepTimersDone(steps: LearnStep[], timers: StartedTimers, step: number) {
  const count = steps[step]?.timers.length ?? 0;
  return count > 0 && Array.from({ length: count }, (_, index) => timers[timerKey(step, index)]).every(
    (started) => started?.status === "done"
  );
}

// The notification and banner when a timer ends. When it was the step's last
// timer: "Time for the next step" with the next step's name, and a tap opens
// that step. On the last step, or with other timers still to come: "Timer done".
export function timerDoneMessage(steps: LearnStep[], timers: StartedTimers, done: StartedTimer) {
  const step = steps[done.step];
  const isLastStep = done.step === steps.length - 1;
  const timer = step.timers[done.timer];
  if (stepTimersDone(steps, timers, done.step)) {
    if (isLastStep) {
      return { title: "Timer done", body: "That was the last step.", openStep: done.step };
    }
    return {
      title: "Time for the next step",
      body: `Step ${done.step + 2}: ${steps[done.step + 1].name}`,
      openStep: done.step + 1,
    };
  }
  return {
    title: "Timer done",
    body: `Step ${done.step + 1} · ${formatTimerLength(timer.minSeconds, timer.maxSeconds)}`,
    openStep: done.step,
  };
}
