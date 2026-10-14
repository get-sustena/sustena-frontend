import { Pressable, StyleSheet, View } from "react-native";
import type { LearnTimer } from "../../lib/learnMode/learnSteps";
import {
  formatClock,
  formatTimerLength,
  rangeNote,
  secondsLeft,
  timerKey,
  type StartedTimers,
} from "../../lib/learnMode/learnTimers";
import { theme } from "../../theme/theme";
import { AppText } from "../ui/AppText";
import { Icon, type IconName } from "../ui/Icon";
import { learnColors } from "./learnColors";
import { TimerRing } from "./TimerRing";

export type TimerActions = {
  start: (step: number, timer: number) => void;
  pause: (key: string) => void;
  resume: (key: string) => void;
  cancel: (key: string) => void;
  expand: (key: string) => void;
};

type Props = {
  step: number;
  timers: LearnTimer[];
  started: StartedTimers;
  now: number;
  actions: TimerActions;
};

// A step's timers (v6.8 lmTimers): started ones open up as a countdown, and
// the ones not started sit side by side as "Start 2 min" pills.
export function StepTimers({ step, timers, started, now, actions }: Props) {
  const startedTimers = timers.flatMap((timer, index) => {
    const key = timerKey(step, index);
    const current = started[key];
    if (!current) return [];
    const name = timers.length > 1 ? `Timer ${index + 1}` : "Timer";
    const length = formatTimerLength(timer.minSeconds, timer.maxSeconds);

    if (current.status === "done") {
      return [
        <View key={key} style={[styles.timer, styles.timerDone]}>
          <Icon name="check" size={20} strokeWidth={2.25} color={theme.colors.navy3} />
          <AppText style={styles.doneText}>{`${name} done · ${length}`}</AppText>
        </View>,
      ];
    }

    const paused = current.status === "paused";
    const left = secondsLeft(current, now);
    const note = timer.maxSeconds
      ? rangeNote(timer.minSeconds, timer.maxSeconds)
      : `${formatTimerLength(timer.minSeconds, null)} timer`;

    return [
      <View key={key} style={styles.timer}>
        <Pressable
          onPress={() => actions.expand(key)}
          style={({ pressed }) => [styles.expand, pressed && styles.pressed]}
          accessibilityRole="button"
          accessibilityLabel="Make timer full screen"
        >
          <Icon name="maximize" size={20} strokeWidth={2} color={theme.colors.navy3} />
        </Pressable>

        <View style={styles.clock}>
          <TimerRing
            size={64}
            strokeWidth={6}
            leftFraction={left / current.totalSeconds}
            trackColor={theme.colors.border}
            color={theme.colors.navy3}
          />
          <View style={styles.clockText}>
            <AppText style={styles.count} accessibilityRole="timer">
              {formatClock(left)}
            </AppText>
            <AppText style={styles.of}>{paused ? `Paused · ${note}` : note}</AppText>
          </View>
        </View>

        <View style={styles.controls}>
          {paused ? (
            <ControlButton icon="play" label="Resume" onPress={() => actions.resume(key)} />
          ) : (
            <ControlButton icon="pause" label="Pause" onPress={() => actions.pause(key)} />
          )}
          <ControlButton label="Cancel" onPress={() => actions.cancel(key)} />
        </View>
      </View>,
    ];
  });

  const notStarted = timers.flatMap((timer, index) =>
    started[timerKey(step, index)]
      ? []
      : [
          <Pressable
            key={index}
            onPress={() => actions.start(step, index)}
            style={({ pressed }) => [styles.start, pressed && styles.pressed]}
            accessibilityRole="button"
          >
            <Icon name="timer" size={20} strokeWidth={2} color={theme.colors.navy3} />
            <AppText style={styles.startText}>
              {`Start ${formatTimerLength(timer.minSeconds, timer.maxSeconds)}`}
            </AppText>
          </Pressable>,
        ]
  );

  return (
    <>
      {startedTimers}
      {notStarted.length ? <View style={styles.startRow}>{notStarted}</View> : null}
    </>
  );
}

// v6.8 .lm-controls .co-secondary: the secondary pill at 44px and 14px text.
function ControlButton({
  icon,
  label,
  onPress,
}: {
  icon?: IconName;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.control, pressed && styles.pressed]}
      accessibilityRole="button"
    >
      {icon ? <Icon name={icon} size={18} color={theme.colors.navy} /> : null}
      <AppText style={styles.controlText}>{label}</AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  startRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 16,
  },
  start: {
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingLeft: 16,
    paddingRight: 20,
    borderRadius: 999,
    backgroundColor: learnColors.greenSoft,
  },
  // v6.8 uses Inter 650; 600 is the nearest weight the app loads.
  startText: {
    fontFamily: theme.fontFamily.bodySemiBold,
    fontSize: 16,
    color: theme.colors.navy3,
  },
  timer: {
    marginTop: 16,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 18,
    backgroundColor: learnColors.greenSoft,
  },
  timerDone: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  doneText: {
    fontFamily: theme.fontFamily.bodySemiBold,
    fontSize: 14,
    lineHeight: 18,
    color: theme.colors.navy3,
  },
  expand: {
    position: "absolute",
    top: 12,
    right: 12,
    zIndex: 1,
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: learnColors.card,
  },
  clock: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingRight: 44,
  },
  clockText: {
    flex: 1,
  },
  count: {
    fontFamily: theme.fontFamily.display,
    fontSize: 40,
    lineHeight: 40,
    letterSpacing: -0.8,
    fontVariant: ["tabular-nums"],
    color: theme.colors.navy,
  },
  of: {
    marginTop: 5,
    fontSize: 13,
    lineHeight: 17.5,
    color: theme.colors.textMedium,
  },
  controls: {
    flexDirection: "row",
    gap: 10,
    marginTop: 14,
  },
  control: {
    flex: 1,
    minHeight: 44,
    paddingHorizontal: 20,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: theme.colors.lineStrong,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  controlText: {
    fontFamily: theme.fontFamily.bodySemiBold,
    fontSize: 14,
    color: theme.colors.navy,
  },
  pressed: {
    opacity: 0.85,
  },
});
