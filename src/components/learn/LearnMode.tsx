import { StatusBar } from "expo-status-bar";
import { useEffect, useEffectEvent, useMemo, useRef, useState } from "react";
import { Modal, Platform, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { useReducedMotion } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useScreenAwake } from "../../hooks/useScreenAwake";
import { buildLearnSteps, type LearnInstruction } from "../../lib/learnMode/learnSteps";
import {
  formatClock,
  nearestRunningTimer,
  pauseTimer,
  resumeTimer,
  secondsLeft,
  settleTimers,
  startTimer,
  stepTimersDone,
  timerDoneMessage,
  timerKey,
  upcomingTimerAlerts,
  type StartedTimers,
} from "../../lib/learnMode/learnTimers";
import { canReadAloud, readAloud, stopReading } from "../../lib/learnMode/readAloud";
import { timerAlertId } from "../../lib/learnMode/timerAlertData";
import { allowTimerAlerts, buzz, replaceTimerAlerts } from "../../lib/learnMode/timerAlerts";
import type { RecipeSource } from "../../lib/recipeSource";
import { useLearnStore } from "../../store/learnStore";
import { theme } from "../../theme/theme";
import type { RecipeIngredient } from "../../types/api";
import { WEB_APP_MAX_WIDTH, WEB_FRAME_BACKGROUND } from "../layout/WebAppFrame";
import { CookedButton } from "../recipe/CookedButton";
import { AppText } from "../ui/AppText";
import { Icon } from "../ui/Icon";
import { FullScreenTimer } from "./FullScreenTimer";
import { LearnBanner, type BannerMessage } from "./LearnBanner";
import { LearnHeader, LearnPhoto } from "./LearnHeader";
import { LearnPage } from "./LearnPage";
import { LearnStepCard } from "./LearnStepCard";
import { learnColors } from "./learnColors";
import type { TimerActions } from "./StepTimers";

type Props = {
  initialStep: number;
  recipeId: string;
  recipeName: string;
  imageUrl?: string | null;
  source?: RecipeSource;
  instructions: LearnInstruction[];
  ingredients: RecipeIngredient[];
  isSaved: boolean;
  onToggleSave: () => void;
  onClose: () => void;
};

const NO_TIMERS: StartedTimers = {};
// A timer that ended longer ago than this ended while the app was away, and
// its phone notification has already said so.
const ANNOUNCE_WITHIN_MS = 3000;

// Learn mode (PRD v6.8 section 17): the recipe's steps one at a time, on
// cards over the recipe photo, with each step's tip, common mistake, timers
// and ingredients.
export function LearnMode({
  initialStep,
  recipeId,
  recipeName,
  imageUrl,
  source,
  instructions,
  ingredients,
  isSaved,
  onToggleSave,
  onClose,
}: Props) {
  const insets = useSafeAreaInsets();
  const reduceMotion = useReducedMotion();
  useScreenAwake();

  const steps = useMemo(() => buildLearnSteps(instructions, ingredients), [instructions, ingredients]);
  const count = steps.length;
  const ownsTimers = useLearnStore((state) => state.recipeId === recipeId);
  const storedTimers = useLearnStore((state) => state.timers);
  const timers = ownsTimers ? storedTimers : NO_TIMERS;

  const trackRef = useRef<ScrollView>(null);
  const [size, setSize] = useState<{ width: number; height: number } | null>(null);
  const [current, setCurrent] = useState(Math.min(Math.max(0, initialStep), count));
  const [now, setNow] = useState(Date.now);
  const [openNotes, setOpenNotes] = useState<ReadonlySet<string>>(new Set());
  const [speakingStep, setSpeakingStep] = useState<number | null>(null);
  const [fullKey, setFullKey] = useState<string | null>(null);
  const [banner, setBanner] = useState<BannerMessage | null>(null);
  const [revealStep, setRevealStep] = useState<number | null>(null);

  const top = insets.top + 8;
  const hasRunning = Object.values(timers).some((started) => started.status === "running");

  // This recipe's timers, and its banner in place of phone notifications.
  useEffect(() => {
    const learn = useLearnStore.getState();
    learn.begin(recipeId);
    learn.setOnScreen(recipeId);
    return () => {
      useLearnStore.getState().setOnScreen(null);
      stopReading();
    };
  }, [recipeId]);

  // Counts down, and marks timers done as they end.
  useEffect(() => {
    if (!hasRunning) return;

    const tick = () => {
      const at = Date.now();
      setNow(at);
      const learn = useLearnStore.getState();
      if (learn.recipeId !== recipeId) return;

      const { timers: settled, finished } = settleTimers(learn.timers, at);
      if (!finished.length) return;
      learn.updateTimers(() => settled);

      const finishedKeys = new Set(finished.map((done) => timerKey(done.step, done.timer)));
      setFullKey((key) => (key && finishedKeys.has(key) ? null : key));
      for (const done of finished) {
        if (stepTimersDone(steps, settled, done.step)) setRevealStep(done.step);
      }

      const announced = finished.filter((done) => at - done.endsAt < ANNOUNCE_WITHIN_MS).at(-1);
      if (announced) {
        setBanner({ id: at, ...timerDoneMessage(steps, settled, announced) });
        buzz();
      }
    };

    tick();
    const interval = setInterval(tick, 250);
    return () => clearInterval(interval);
  }, [hasRunning, recipeId, steps]);

  // A phone notification for each running timer, for when the app is away.
  useEffect(() => {
    if (!ownsTimers) return;
    const at = Date.now();
    replaceTimerAlerts(
      upcomingTimerAlerts(steps, timers)
        .filter((alert) => alert.endsAt > at)
        .map((alert) => ({
          id: timerAlertId(recipeId, alert.key),
          endsAt: alert.endsAt,
          title: alert.title,
          body: alert.body,
          target: { recipeId, step: alert.openStep, source },
        }))
    );
  }, [ownsTimers, recipeId, source, steps, timers]);

  function changeStep(next: number) {
    if (next === current) return;
    setCurrent(next);
    if (speakingStep !== null && speakingStep !== next) {
      stopReading();
      setSpeakingStep(null);
    }
  }

  function goTo(step: number) {
    const next = Math.max(0, Math.min(count, step));
    if (size) trackRef.current?.scrollTo({ x: next * size.width, animated: !reduceMotion });
    changeStep(next);
  }

  // A tapped timer notification for this recipe opens its step.
  const openRequestedStep = useEffectEvent((step: number) => {
    setBanner(null);
    goTo(step);
  });
  useEffect(
    () =>
      useLearnStore.subscribe((state) => {
        const request = state.stepRequest;
        if (!request || request.recipeId !== recipeId) return;
        state.clearStepRequest();
        openRequestedStep(request.step);
      }),
    [recipeId]
  );

  function updateTimers(update: (started: StartedTimers) => StartedTimers) {
    setNow(Date.now());
    useLearnStore.getState().updateTimers(update);
  }

  const timerActions: TimerActions = {
    start: (step, index) => {
      const key = timerKey(step, index);
      if (timers[key] && timers[key].status !== "done") return;
      const seconds = steps[step].timers[index].minSeconds;
      updateTimers((started) => ({ ...started, [key]: startTimer(step, index, seconds, Date.now()) }));
      void allowTimerAlerts().catch(() => undefined);
    },
    pause: (key) =>
      updateTimers((started) =>
        started[key] ? { ...started, [key]: pauseTimer(started[key], Date.now()) } : started
      ),
    resume: (key) =>
      updateTimers((started) =>
        started[key] ? { ...started, [key]: resumeTimer(started[key], Date.now()) } : started
      ),
    cancel: (key) => {
      setFullKey((open) => (open === key ? null : open));
      updateTimers((started) =>
        Object.fromEntries(Object.entries(started).filter(([startedKey]) => startedKey !== key))
      );
    },
    expand: setFullKey,
  };

  function toggleNote(key: string) {
    setOpenNotes((open) => {
      const next = new Set(open);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function speak(step: number) {
    if (speakingStep === step) {
      stopReading();
      setSpeakingStep(null);
      return;
    }
    setSpeakingStep(step);
    readAloud(`${steps[step].name}. ${steps[step].text}`, () =>
      setSpeakingStep((speaking) => (speaking === step ? null : speaking))
    );
  }

  function close() {
    if (fullKey) setFullKey(null);
    else onClose();
  }

  const fullTimer = fullKey ? timers[fullKey] : undefined;
  const running = nearestRunningTimer(timers, now, current);
  const trackTop = top + 68;

  return (
    <Modal visible transparent animationType="slide" statusBarTranslucent onRequestClose={close}>
      <StatusBar style="light" />
      <View style={styles.frame}>
        <View
          style={styles.screen}
          onLayout={(event) => {
            const { width, height } = event.nativeEvent.layout;
            setSize({ width, height });
          }}
        >
          <LearnPhoto imageUrl={imageUrl} />
          <LearnHeader
            top={top}
            recipeName={recipeName}
            subtitle={current < count ? `Step ${current + 1} of ${count}` : "All steps done"}
            stepCount={count}
            current={current}
            isSaved={isSaved}
            onClose={onClose}
            onToggleSave={onToggleSave}
          />

          {size ? (
            <View style={[styles.track, { top: trackTop }]}>
              <ScrollView
                ref={trackRef}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                scrollEventThrottle={16}
                onScroll={(event) => {
                  changeStep(Math.round(event.nativeEvent.contentOffset.x / size.width));
                }}
                onContentSizeChange={() => {
                  trackRef.current?.scrollTo({ x: current * size.width, animated: false });
                }}
                accessibilityLabel="Steps"
              >
                {steps.map((step, index) => (
                  <LearnPage
                    key={index}
                    width={size.width}
                    height={size.height - trackTop}
                    bottomInset={insets.bottom}
                    label={`Step ${index + 1} of ${count}`}
                    isFirst={index === 0}
                    nextLabel={index === count - 1 ? "Finish" : "Next step"}
                    showNextIcon
                    revealReady={revealStep === index}
                    onRevealed={() => setRevealStep(null)}
                    onBack={() => goTo(index - 1)}
                    onNext={() => goTo(index + 1)}
                  >
                    <LearnStepCard
                      index={index}
                      step={step}
                      nextStepName={steps[index + 1]?.name ?? null}
                      started={timers}
                      now={now}
                      openNotes={openNotes}
                      speaking={speakingStep === index}
                      canSpeak={canReadAloud}
                      ready={stepTimersDone(steps, timers, index)}
                      timerActions={timerActions}
                      onToggleNote={toggleNote}
                      onSpeak={() => speak(index)}
                      onNext={() => goTo(index + 1)}
                    />
                  </LearnPage>
                ))}

                <LearnPage
                  width={size.width}
                  height={size.height - trackTop}
                  bottomInset={insets.bottom}
                  label="All steps done"
                  isFirst={count === 0}
                  nextLabel="Done"
                  showNextIcon={false}
                  centered
                  revealReady={false}
                  onRevealed={() => undefined}
                  onBack={() => goTo(count - 1)}
                  onNext={onClose}
                >
                  <Icon name="chefHat" size={44} color={theme.colors.navy3} />
                  <AppText style={styles.finishTitle} accessibilityRole="header">
                    All steps done
                  </AppText>
                  <AppText style={styles.finishText}>{`Enjoy your ${recipeName}.`}</AppText>
                  <View style={styles.finishCooked}>
                    <CookedButton recipeId={recipeId} source={source} />
                  </View>
                </LearnPage>
              </ScrollView>
            </View>
          ) : null}

          {running ? (
            <View style={[styles.chipRow, { top: top + 72 }]} pointerEvents="box-none">
              <Pressable
                onPress={() => goTo(running.step)}
                style={({ pressed }) => [styles.chip, pressed && styles.pressed]}
                accessibilityRole="button"
                accessibilityLabel={`Go to step ${running.step + 1}, timer ${formatClock(secondsLeft(running, now))}`}
              >
                <Icon name="timer" size={15} color={theme.colors.navy3} />
                <AppText style={styles.chipText}>
                  {`Step ${running.step + 1} · ${formatClock(secondsLeft(running, now))}`}
                </AppText>
              </Pressable>
            </View>
          ) : null}

          {fullKey && fullTimer && fullTimer.status !== "done" && size ? (
            <FullScreenTimer
              stepName={steps[fullTimer.step].name}
              timer={steps[fullTimer.step].timers[fullTimer.timer]}
              started={fullTimer}
              now={now}
              top={top}
              bottom={insets.bottom}
              width={size.width}
              onPause={() => timerActions.pause(fullKey)}
              onResume={() => timerActions.resume(fullKey)}
              onCancel={() => timerActions.cancel(fullKey)}
              onMinimize={() => setFullKey(null)}
            />
          ) : null}

          <LearnBanner
            message={banner}
            top={insets.top + 6}
            onPress={(message) => {
              setBanner(null);
              goTo(message.openStep);
            }}
            onHide={() => setBanner(null)}
          />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  // On a wide screen Learn mode keeps to the app's width, as the app does.
  frame: {
    flex: 1,
    alignItems: "center",
    backgroundColor: Platform.OS === "web" ? WEB_FRAME_BACKGROUND : learnColors.background,
  },
  screen: {
    flex: 1,
    width: "100%",
    maxWidth: WEB_APP_MAX_WIDTH,
    overflow: "hidden",
    backgroundColor: learnColors.background,
  },
  track: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    overflow: "hidden",
  },
  chipRow: {
    position: "absolute",
    left: 0,
    right: 0,
    zIndex: 8,
    alignItems: "center",
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 999,
    backgroundColor: theme.colors.white,
    boxShadow: "0px 4px 14px rgba(0,0,0,0.18)",
  },
  // v6.8 uses Inter 650; 600 is the nearest weight the app loads.
  chipText: {
    fontFamily: theme.fontFamily.bodySemiBold,
    fontSize: 13,
    lineHeight: 13,
    fontVariant: ["tabular-nums"],
    color: theme.colors.navy3,
  },
  finishTitle: {
    marginTop: 4,
    fontFamily: theme.fontFamily.display,
    fontSize: 30,
    lineHeight: 32.4,
    letterSpacing: -0.75,
    textAlign: "center",
    color: theme.colors.navy,
  },
  finishText: {
    marginTop: 10,
    marginBottom: 22,
    fontSize: 16,
    lineHeight: 24,
    textAlign: "center",
    color: theme.colors.text,
  },
  finishCooked: {
    alignSelf: "stretch",
  },
  pressed: {
    opacity: 0.85,
  },
});
