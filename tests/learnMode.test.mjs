import assert from "node:assert/strict";
import { test } from "node:test";
import { buildLearnSteps } from "../src/lib/learnMode/learnSteps.ts";
import {
  formatClock,
  formatTimerLength,
  nearestRunningTimer,
  pauseTimer,
  rangeNote,
  resumeTimer,
  secondsLeft,
  settleTimers,
  startTimer,
  stepTimersDone,
  timerDoneMessage,
  timerKey,
} from "../src/lib/learnMode/learnTimers.ts";

const ingredient = (position, name, ingredientId = null) => ({
  id: `ing-${position}`,
  position,
  rawText: name,
  ingredientName: name,
  canonicalIngredientName: null,
  ingredientId,
});

const instruction = (stepNumber, displayText, extra = {}) => ({
  stepNumber,
  stepName: null,
  text: displayText,
  commonMistake: null,
  helpfulTip: null,
  segments: [],
  timers: [],
  displayText,
  ...extra,
});

const highlighted = (text, timer) => timer.ranges.map((range) => text.slice(range.start, range.end));

test("each step takes its name, text, tip and mistake, and leaves empty parts empty", () => {
  const [first, second] = buildLearnSteps(
    [
      instruction(2, "Add the rice.", { stepName: " Add the rice ", commonMistake: "Too much water." }),
      instruction(1, "Wash the rice.", { helpfulTip: "  " }),
    ],
    []
  );

  assert.equal(first.name, "Step 1");
  assert.equal(first.tip, null);
  assert.equal(first.mistake, null);
  assert.equal(second.name, "Add the rice");
  assert.equal(second.mistake, "Too much water.");
  assert.deepEqual(second.timers, []);
  assert.deepEqual(second.ingredients, []);
});

test("without confirmed timers, the times written in the step become timers", () => {
  const text = "Fry for 2 minutes, then simmer 15-20 mins.";
  const [step] = buildLearnSteps([instruction(1, text)], []);

  assert.deepEqual(
    step.timers.map((timer) => [timer.minSeconds, timer.maxSeconds, highlighted(text, timer)]),
    [
      [120, null, ["2 minutes"]],
      [900, 1200, ["15-20 mins"]],
    ]
  );
});

test("a confirmed timer highlights every place its sources point to", () => {
  const text = "Stir for 5 minutes, add the leaves, then cook 5 minutes more.";
  const fiveMinutes = {
    id: "t1",
    position: 0,
    label: null,
    durationMinSeconds: 300,
    durationMaxSeconds: null,
    sources: [
      { text: "5 minutes", start: 9, end: 18 },
      { text: "5 minutes", start: 46, end: 55 },
    ],
  };
  const [step] = buildLearnSteps([instruction(1, text, { timers: [fiveMinutes] })], []);

  assert.equal(step.timers.length, 1);
  assert.deepEqual(step.timers[0].ranges, [
    { start: 9, end: 18 },
    { start: 46, end: 55 },
  ]);
});

test("when the shown text is scaled, sources are found by their words", () => {
  const text = "Add 2 cups of water and boil 10 minutes.";
  const displayText = "Add 4 cups of water and boil 10 minutes.";
  const timer = {
    id: "t1",
    position: 0,
    label: null,
    durationMinSeconds: 600,
    durationMaxSeconds: null,
    sources: [{ text: "10 minutes", start: 29, end: 39 }],
  };
  const [step] = buildLearnSteps([instruction(1, displayText, { text, timers: [timer] })], []);

  assert.deepEqual(highlighted(displayText, step.timers[0]), ["10 minutes"]);
});

test("confirmed timers from older APIs highlight the written time that matches", () => {
  const text = "Simmer 15-20 mins, then rest 5 minutes.";
  const confirmed = [
    { id: "t2", position: 1, label: null, durationMinSeconds: 600, durationMaxSeconds: null },
    { id: "t1", position: 0, label: null, durationMinSeconds: 900, durationMaxSeconds: 1200 },
  ];
  const [step] = buildLearnSteps([instruction(1, text, { timers: confirmed })], []);

  assert.equal(step.timers.length, 2);
  assert.deepEqual(highlighted(text, step.timers[0]), ["15-20 mins"]);
  assert.equal(step.timers[1].minSeconds, 600);
  assert.deepEqual(step.timers[1].ranges, []);
});

test("step ingredients come from the quantity segments, once each, in order", () => {
  const segments = [
    { type: "text", text: "Add " },
    { type: "quantity", text: "2 cups", ingredientPosition: 3 },
    { type: "quantity", text: "1 onion", ingredientPosition: 1 },
    { type: "quantity", text: "more rice", ingredientPosition: 3 },
    { type: "quantity", text: "salt", ingredientPosition: 9 },
  ];
  const [step] = buildLearnSteps(
    [instruction(1, "Add rice and onion.", { segments })],
    [ingredient(1, "Onion", "onion"), ingredient(3, "Rice", "rice")]
  );

  assert.deepEqual(step.ingredients.map((found) => found.name), ["Rice", "Onion"]);
});

test("a timer runs, pauses and resumes from where it stopped", () => {
  let timer = startTimer(0, 0, 120, 1_000);
  assert.equal(secondsLeft(timer, 31_000), 90);

  timer = pauseTimer(timer, 31_000);
  assert.equal(secondsLeft(timer, 500_000), 90);

  timer = resumeTimer(timer, 600_000);
  assert.equal(secondsLeft(timer, 630_000), 60);
});

test("settling marks finished timers done and reports them", () => {
  const timers = {
    [timerKey(0, 0)]: startTimer(0, 0, 60, 0),
    [timerKey(1, 0)]: startTimer(1, 0, 600, 0),
  };
  const { timers: next, finished } = settleTimers(timers, 60_000);

  assert.deepEqual(finished.map((done) => done.step), [0]);
  assert.equal(next[timerKey(0, 0)].status, "done");
  assert.equal(next[timerKey(1, 0)].status, "running");
  assert.equal(nearestRunningTimer(next, 60_000, 0).step, 1);
  assert.equal(nearestRunningTimer(next, 60_000, 1), null);
});

test("times read as the prototype shows them", () => {
  assert.equal(formatClock(723), "12:03");
  assert.equal(formatClock(3900), "1:05:00");
  assert.equal(formatClock(0.2), "0:01");
  assert.equal(formatTimerLength(120, null), "2 min");
  assert.equal(formatTimerLength(900, 1200), "15–20 min");
  assert.equal(formatTimerLength(30, null), "30 sec");
  assert.equal(rangeNote(900, 1200), "Check after 15 min. It can take up to 20.");
});

test("the last timer of a step says it's time for the next step", () => {
  const steps = buildLearnSteps(
    [
      instruction(1, "Boil 2 minutes, then rest 5 minutes.", { stepName: "Boil the water" }),
      instruction(2, "Add pasta.", { stepName: "Add the pasta" }),
    ],
    []
  );
  const first = { ...startTimer(0, 0, 120, 0), status: "done" };
  let timers = { [timerKey(0, 0)]: first };

  assert.deepEqual(timerDoneMessage(steps, timers, first), {
    title: "Timer done",
    body: "Step 1 · 2 min",
    openStep: 0,
  });

  const second = { ...startTimer(0, 1, 300, 0), status: "done" };
  timers = { ...timers, [timerKey(0, 1)]: second };
  assert.equal(stepTimersDone(steps, timers, 0), true);
  assert.deepEqual(timerDoneMessage(steps, timers, second), {
    title: "Time for the next step",
    body: "Step 2: Add the pasta",
    openStep: 1,
  });
});

test("the last step's last timer says so", () => {
  const steps = buildLearnSteps([instruction(1, "Rest 5 minutes.")], []);
  const done = { ...startTimer(0, 0, 300, 0), status: "done" };

  assert.deepEqual(timerDoneMessage(steps, { [timerKey(0, 0)]: done }, done), {
    title: "Timer done",
    body: "That was the last step.",
    openStep: 0,
  });
});
